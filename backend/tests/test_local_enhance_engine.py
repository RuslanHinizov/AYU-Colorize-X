from pathlib import Path

import pytest
from PIL import Image

from config import settings
from services.local_enhance_engine import (
    LocalEnhanceUnavailable,
    copy_image_as_jpeg,
    restore_with_vqfr,
    upscale_with_pisasr,
)


def test_copy_image_as_jpeg_writes_valid_rgb_jpeg(tmp_path: Path):
    source = tmp_path / "source.png"
    output = tmp_path / "output.jpg"
    Image.new("RGBA", (8, 8), (20, 40, 60, 128)).save(source)

    copy_image_as_jpeg(str(source), str(output))

    with Image.open(output) as image:
        assert image.format == "JPEG"
        assert image.mode == "RGB"
        assert image.size == (8, 8)


def test_vqfr_reports_missing_weight_with_actionable_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    repo = tmp_path / "VQFR"
    (repo / "experiments" / "pretrained_models").mkdir(parents=True)
    (repo / "demo.py").write_text("print('unused')", encoding="utf-8")

    monkeypatch.setattr(settings, "VQFR_REPO_DIR", str(repo))
    monkeypatch.setattr(settings, "VQFR_MODEL_VERSION", "2.0")
    monkeypatch.setattr(settings, "VQFR_MODEL_PATH", str(repo / "experiments" / "pretrained_models" / "VQFR_v2.pth"))

    with pytest.raises(LocalEnhanceUnavailable, match="VQFR model agirligi"):
        restore_with_vqfr("missing-input.jpg", str(tmp_path / "out.jpg"))


def test_pisasr_reports_missing_isolated_python_runtime(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    repo = tmp_path / "PiSA-SR"
    repo.mkdir()
    (repo / "test_pisasr.py").write_text("print('unused')", encoding="utf-8")
    model = repo / "preset" / "models" / "pisa_sr.pkl"
    model.parent.mkdir(parents=True)
    model.write_bytes(b"placeholder")
    sd21 = repo / "preset" / "models" / "stable-diffusion-2-1-base"
    sd21.mkdir()

    monkeypatch.setattr(settings, "PISASR_REPO_DIR", str(repo))
    monkeypatch.setattr(settings, "PISASR_MODEL_PATH", str(model))
    monkeypatch.setattr(settings, "PISASR_SD21_PATH", str(sd21))
    monkeypatch.setattr(settings, "PISASR_PYTHON", "")

    with pytest.raises(LocalEnhanceUnavailable, match="PiSA-SR Python runtime"):
        upscale_with_pisasr("missing-input.jpg", str(tmp_path / "out.jpg"))
