"""
Adapters for optional local image enhancement models.

VQFR and PiSA-SR ship as research repositories with dependencies that can
conflict with the main FastAPI runtime. We keep the integration at a process
boundary so a broken model environment cannot poison the web worker process.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Callable

from PIL import Image, ImageOps

from config import settings

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int], None] | None

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class LocalEnhanceError(RuntimeError):
    """Base error for local enhancement providers."""


class LocalEnhanceUnavailable(LocalEnhanceError):
    """Raised when model files or runtime dependencies are not installed."""


class LocalEnhanceExecutionError(LocalEnhanceError):
    """Raised when an installed provider fails during inference."""


def _resolve_backend_path(value: str | None, default: str) -> Path:
    raw_value = value or default
    path = Path(raw_value).expanduser()
    if not path.is_absolute():
        path = BACKEND_ROOT / path
    return path.resolve()


def _ensure_file(path: Path, label: str, hint: str) -> None:
    if not path.is_file():
        raise LocalEnhanceUnavailable(f"{label} bulunamadi: {path}. {hint}")


def _ensure_dir(path: Path, label: str, hint: str) -> None:
    if not path.is_dir():
        raise LocalEnhanceUnavailable(f"{label} bulunamadi: {path}. {hint}")


def _report(progress_callback: ProgressCallback, value: int) -> None:
    if progress_callback:
        progress_callback(max(0, min(95, int(value))))


def _tail(text: str, max_chars: int = 4000) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def _run_subprocess(
    command: list[str],
    *,
    cwd: Path,
    timeout_seconds: int,
    provider_name: str,
) -> None:
    env = os.environ.copy()
    existing_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = str(cwd) if not existing_pythonpath else f"{cwd}{os.pathsep}{existing_pythonpath}"
    env["PYTHONUTF8"] = "1"
    env.setdefault("HF_HOME", str(BACKEND_ROOT / ".hf_cache"))
    env.setdefault("HUGGINGFACE_HUB_CACHE", str(BACKEND_ROOT / ".hf_cache" / "hub"))

    logger.info("Starting %s inference: %s", provider_name, " ".join(command))
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise LocalEnhanceExecutionError(
            f"{provider_name} zaman asimina ulasti ({timeout_seconds}s)"
        ) from exc

    if completed.returncode != 0:
        details = "\n".join(part for part in (_tail(completed.stdout), _tail(completed.stderr)) if part)
        if "out of memory" in details.lower() or "cuda oom" in details.lower():
            raise LocalEnhanceExecutionError(f"{provider_name} GPU bellegi yetmedi. {details}")
        raise LocalEnhanceExecutionError(f"{provider_name} inference basarisiz. {details}")


def _save_rgb_jpeg(source_path: Path, output_path: str | Path) -> None:
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.save(output, format="JPEG", quality=95, optimize=True)


def _prepare_jpeg_input(input_path: str | Path, temp_dir: Path, filename: str = "input.jpg") -> Path:
    prepared_path = temp_dir / filename
    with Image.open(input_path) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.save(prepared_path, format="JPEG", quality=95)
    return prepared_path


def restore_with_vqfr(
    input_path: str,
    output_path: str,
    progress_callback: ProgressCallback = None,
) -> float:
    """Restore faces with VQFR and paste them back into the original image."""
    start_time = time.time()
    repo_dir = _resolve_backend_path(settings.VQFR_REPO_DIR, "external_repos/VQFR")
    configured_model_path = _resolve_backend_path(
        settings.VQFR_MODEL_PATH,
        "external_repos/VQFR/experiments/pretrained_models/VQFR_v2.pth",
    )
    model_name = "VQFR_v1-33a1fac5.pth" if settings.VQFR_MODEL_VERSION == "1.0" else "VQFR_v2.pth"
    model_path = repo_dir / "experiments" / "pretrained_models" / model_name

    _ensure_dir(repo_dir, "VQFR repo", "Repo backend/external_repos/VQFR altinda olmali.")
    _ensure_file(
        repo_dir / "demo.py",
        "VQFR demo.py",
        "VQFR repo eksik veya bozuk klonlanmis.",
    )
    if configured_model_path != model_path and configured_model_path.is_file() and not model_path.is_file():
        raise LocalEnhanceUnavailable(
            f"VQFR demo modeli bu yolda bekliyor: {model_path}. "
            f"Mevcut dosyayi buraya tasi veya VQFR repo icindeki pretrained_models klasorunu kullan: {configured_model_path}"
        )
    _ensure_file(
        model_path,
        "VQFR model agirligi",
        "VQFR_v2.pth dosyasini VQFR/experiments/pretrained_models altina koy.",
    )

    _report(progress_callback, 10)
    with tempfile.TemporaryDirectory(prefix="vqfr_") as temp_name:
        temp_dir = Path(temp_name)
        prepared_input = _prepare_jpeg_input(input_path, temp_dir)
        result_dir = temp_dir / "results"

        command = [
            sys.executable,
            str(BACKEND_ROOT / "services" / "vqfr_runner.py"),
            "--repo-dir",
            str(repo_dir),
            "--input",
            str(prepared_input),
            "--output",
            str(result_dir),
            "--version",
            settings.VQFR_MODEL_VERSION,
            "--fidelity_ratio",
            str(settings.VQFR_FIDELITY_RATIO),
            "--upscale",
            str(settings.VQFR_UPSCALE),
            "--bg_upsampler",
            "none",
            "--ext",
            "jpg",
        ]
        _run_subprocess(
            command,
            cwd=repo_dir,
            timeout_seconds=settings.VQFR_TIMEOUT_SECONDS,
            provider_name="VQFR",
        )
        _report(progress_callback, 80)

        restored_path = result_dir / "restored_imgs" / "input.jpg"
        _ensure_file(restored_path, "VQFR cikti dosyasi", "Inference tamamlandi ama sonuc uretilmedi.")
        _save_rgb_jpeg(restored_path, output_path)

    _report(progress_callback, 95)
    return time.time() - start_time


def _resolve_pisasr_python(repo_dir: Path) -> Path:
    candidates: list[Path] = []
    if settings.PISASR_PYTHON.strip():
        candidates.append(_resolve_backend_path(settings.PISASR_PYTHON, ""))
    candidates.extend(
        [
            repo_dir / ".venv" / "Scripts" / "python.exe",
            repo_dir / ".venv" / "bin" / "python",
        ]
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise LocalEnhanceUnavailable(
        "PiSA-SR Python runtime bulunamadi. "
        "PiSA-SR icin ayri venv kur ve PISASR_PYTHON ile python yolunu ver."
    )


def upscale_with_pisasr(
    input_path: str,
    output_path: str,
    progress_callback: ProgressCallback = None,
) -> float:
    """Upscale the full image with PiSA-SR using an isolated Python runtime."""
    start_time = time.time()
    repo_dir = _resolve_backend_path(settings.PISASR_REPO_DIR, "external_repos/PiSA-SR")
    model_path = _resolve_backend_path(settings.PISASR_MODEL_PATH, "external_repos/PiSA-SR/preset/models/pisa_sr.pkl")
    sd21_path = _resolve_backend_path(
        settings.PISASR_SD21_PATH,
        "external_repos/PiSA-SR/preset/models/stable-diffusion-2-1-base",
    )

    _ensure_dir(repo_dir, "PiSA-SR repo", "Repo backend/external_repos/PiSA-SR altinda olmali.")
    _ensure_file(repo_dir / "test_pisasr.py", "PiSA-SR test_pisasr.py", "PiSA-SR repo eksik veya bozuk.")
    _ensure_file(model_path, "PiSA-SR model agirligi", "pisa_sr.pkl dosyasini PiSA-SR/preset/models altina koy.")
    _ensure_dir(sd21_path, "Stable Diffusion 2.1 base", "SD 2.1 model klasorunu PISASR_SD21_PATH altina koy.")
    python_path = _resolve_pisasr_python(repo_dir)

    _report(progress_callback, 10)
    with tempfile.TemporaryDirectory(prefix="pisasr_") as temp_name:
        temp_dir = Path(temp_name)
        prepared_input = _prepare_jpeg_input(input_path, temp_dir)
        result_dir = temp_dir / "results"

        command = [
            str(python_path),
            "test_pisasr.py",
            "--input_image",
            str(prepared_input),
            "--output_dir",
            str(result_dir),
            "--pretrained_model_path",
            str(sd21_path),
            "--pretrained_path",
            str(model_path),
            "--process_size",
            str(settings.PISASR_PROCESS_SIZE),
            "--upscale",
            str(settings.PISASR_UPSCALE),
            "--latent_tiled_size",
            "96",
            "--latent_tiled_overlap",
            "32",
            "--vae_decoder_tiled_size",
            "224",
            "--vae_encoder_tiled_size",
            "1024",
            "--mixed_precision",
            "fp16",
            "--default",
        ]
        _run_subprocess(
            command,
            cwd=repo_dir,
            timeout_seconds=settings.PISASR_TIMEOUT_SECONDS,
            provider_name="PiSA-SR",
        )
        _report(progress_callback, 85)

        result_path = result_dir / "input.jpg"
        _ensure_file(result_path, "PiSA-SR cikti dosyasi", "Inference tamamlandi ama sonuc uretilmedi.")
        _save_rgb_jpeg(result_path, output_path)

    _report(progress_callback, 95)
    return time.time() - start_time


def copy_image_as_jpeg(input_path: str, output_path: str) -> None:
    """Last-resort fallback that preserves a valid JPEG contract for downloads."""
    try:
        _save_rgb_jpeg(Path(input_path), output_path)
    except Exception:
        shutil.copy(input_path, output_path)
