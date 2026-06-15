"""
SDXL Inpainting service — diffusers/stable-diffusion-xl-1.0-inpainting-0.1.
~6.5 GB fp16 model, ~1-3 minutes on RTX 4060 Laptop (8 GB VRAM).

Primary inpainting engine for both RESTORE_DAMAGE (auto damage detection) and
INPAINT (user-drawn mask) job types. Falls back to FLUX/LaMa/OpenCV elsewhere.
"""
import gc
import logging
import os
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

_REPO_ID = "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"
# Drop-in replacement VAE that doesn't produce NaN/Inf in fp16 (the stock
# SDXL VAE produces gibberish/dithered outputs at fp16). Required for fp16.
_VAE_FIX_REPO = "madebyollin/sdxl-vae-fp16-fix"
_PIPELINE: Optional[object] = None

# Islem cozunurlugu (uzun kenar). SDXL natifi 1024'tur ama 8 GB VRAM'de
# 1024px aktivasyonlari tasar ve paylasimli bellege dokulur (10-50x yavaslama).
# 768 bu kartta VRAM'e sigar; SDXL_TARGET_DIM env ile degistirilebilir.
_TARGET_DIM = int(os.environ.get("SDXL_TARGET_DIM", "768"))

# Varsayilan adim sayisi — 8 GB kart icin 24 (kalite/sure dengesi).
_DEFAULT_STEPS = int(os.environ.get("SDXL_STEPS", "24"))

# Minimum free VRAM to attempt SDXL inference (in GB).
_MIN_VRAM_GB = 6.0

_FACE_AUTO_PROMPT = (
    "old sepia portrait photograph, 1900s, fill only the torn white missing area, "
    "match surrounding skin texture and sepia tone exactly, "
    "same film grain same soft focus same lighting same aged paper texture, "
    "do not change eyes do not change eyebrows do not change forehead do not change mouth"
)
_FACE_AUTO_NEGATIVE = (
    "changed eyes, altered gaze, cross-eyed, looking away, different eye direction, "
    "changed face, different person, modern photo, color photo, oversaturated, "
    "smooth skin, plastic, airbrushed, sharp edges, bright patch, white area, "
    "artifacts, watermark, text, painting, drawing, anime, cartoon, deformed"
)
_OBJECT_REMOVE_PROMPT = (
    "seamlessly fill the masked area with photorealistic background that "
    "matches the surrounding scene, consistent lighting and texture, "
    "natural perspective, no artifacts"
)
_OBJECT_REMOVE_NEGATIVE = (
    "blurry, distorted, low quality, artifacts, watermark, text, "
    "duplicated objects, seams, harsh edges"
)


def _blend_inpaint_result(
    original_bgr: np.ndarray,
    inpainted_bgr: np.ndarray,
    mask: np.ndarray,
) -> np.ndarray:
    """Mask icinde SDXL, disinda orijinal; sinirda Gaussian feathering."""
    h, w = original_bgr.shape[:2]

    if inpainted_bgr.shape[:2] != (h, w):
        inpainted_bgr = cv2.resize(inpainted_bgr, (w, h), interpolation=cv2.INTER_LANCZOS4)

    feather_size = max(5, min(w, h) // 60) * 2 + 1
    feather_mask = cv2.GaussianBlur(mask.astype(np.float32), (feather_size, feather_size), 0)
    feather_mask = (feather_mask / 255.0).clip(0, 1)

    alpha = feather_mask[:, :, np.newaxis]
    blended = (inpainted_bgr.astype(np.float32) * alpha +
               original_bgr.astype(np.float32) * (1.0 - alpha))
    return blended.clip(0, 255).astype(np.uint8)


def _build_damage_mask(img_bgr: np.ndarray, input_path: str, threshold: int = 240) -> np.ndarray:
    """
    Auto-detect missing/damaged pixels.

    Handles four damage patterns:
      1. Alpha-channel transparency (PNG with RGBA → transparent = damaged)
      2. Pure-white missing pieces (mid-size blobs; entire background is excluded)
      3. Bright scratch lines (TOP-HAT morphology — light-on-dark, e.g. old photo dust)
      4. Dark cracks / wrinkles / lines (BLACK-HAT morphology — dark-on-light, e.g.
         cracked-skin texture, dark scratches, fissures)

    Returns uint8 mask: 255 = damaged, 0 = clean.
    """
    h, w = img_bgr.shape[:2]
    img_area = h * w
    combined = np.zeros((h, w), dtype=np.uint8)

    # ── 1. Alpha-channel transparency ────────────────────────────────────────
    try:
        pil_check = Image.open(input_path)
        if pil_check.mode == "RGBA":
            alpha = np.array(pil_check.split()[3])
            transparent = (alpha < 128).astype(np.uint8) * 255
            transparent = cv2.dilate(transparent, np.ones((9, 9), np.uint8), iterations=2)
            combined = cv2.bitwise_or(combined, transparent)
            logger.info(f"Alpha mask: {int(np.sum(transparent > 0))} px")
    except Exception:
        pass

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # ── 2. Pure-white missing pieces (size-filtered) ─────────────────────────
    # Threshold at 240 (stricter than before) — only catches truly blank/torn areas.
    # Exclude blobs that are >40% of image (the entire background) or <0.1% (noise).
    _, white_raw = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    white_raw = cv2.morphologyEx(white_raw, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=2)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(white_raw, connectivity=8)
    white_kept = np.zeros((h, w), dtype=np.uint8)
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if 0.001 * img_area < area < 0.40 * img_area:
            white_kept[labels == i] = 255
    if int(np.sum(white_kept > 0)) > 0:
        # 12px dilation — beyaz yirtigi tam kapsar, ama scratch'ten daha buyuk olmamali.
        # Eski 18px gozlere kadar tasiyordu; 12px yeterli.
        white_kept = cv2.dilate(white_kept, np.ones((7, 7), np.uint8), iterations=2)
        combined = cv2.bitwise_or(combined, white_kept)
        logger.info(f"White-blob mask: {int(np.sum(white_kept > 0))} px")

    def _filter_small_and_guard(mask: np.ndarray, min_area: int, layer_name: str,
                                max_coverage: float = 0.08) -> np.ndarray:
        """Kucuk benekleri at; katman goruntunun cogunu kapliyorsa bu hasar
        degil fotograf grenidir — katmani tamamen iptal et (eski fotograflarda
        dokuyu 'cizik' sanip tum kareyi maskeleme felaketini onler)."""
        num, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        kept = np.zeros_like(mask)
        for i in range(1, num):
            if stats[i, cv2.CC_STAT_AREA] >= min_area:
                kept[labels == i] = 255
        coverage = np.sum(kept > 0) / kept.size
        if coverage > max_coverage:
            logger.info(f"{layer_name} katmani iptal: %{coverage*100:.1f} kapsama "
                        f"(gren/doku, gercek hasar degil)")
            return np.zeros_like(mask)
        logger.info(f"{layer_name}: {int(np.sum(kept > 0))} px (%{coverage*100:.2f})")
        return kept

    # ── 3. Bright scratches (TOP-HAT) — old photo dust/scratches ─────────────
    kv = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
    kh = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
    tophat = cv2.add(
        cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kv),
        cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kh),
    )
    # Esik 30→50: eski fotograflarin dogal parlak greni katmani doldurmasin
    _, bright_scratch = cv2.threshold(tophat, 50, 255, cv2.THRESH_BINARY)
    bright_scratch = _filter_small_and_guard(bright_scratch, min_area=40,
                                             layer_name="Bright-scratch")
    bright_scratch = cv2.dilate(bright_scratch, np.ones((3, 3), np.uint8), iterations=1)
    combined = cv2.bitwise_or(combined, bright_scratch)

    # ── 4. Dark cracks (BLACK-HAT) — devre disi ────────────────────────────
    # Kumas kivrimlari, golge ve dogal cizgiler yanlis maskeleniyor;
    # SDXL+feathering ile yapay izler (mavi/gri artifact) yaratiyordu.
    # Sadece beyaz blob (ana hasar) ve parlak scratch maskelemesi yeterli.

    return combined


def _models_dir() -> Path:
    d = os.environ.get("AI_MODELS_DIR", "")
    if not d:
        try:
            from config import settings
            d = settings.AI_MODELS_DIR
        except Exception:
            pass
    if d:
        return Path(d)
    return Path(__file__).parent.parent / "ai_models"


def _local_cache_dir() -> Path:
    return _models_dir() / "sdxl-inpainting"


def _vae_cache_dir() -> Path:
    return _models_dir() / "sdxl-vae-fp16-fix"


def _hf_token() -> Optional[str]:
    return os.environ.get("HF_TOKEN") or None


def _is_model_ready() -> bool:
    d = _local_cache_dir()
    v = _vae_cache_dir()
    return (
        d.exists() and (d / "model_index.json").exists()
        and v.exists() and (v / "config.json").exists()
    )


def _free_vram_gb() -> float:
    if not torch.cuda.is_available():
        return 0.0
    props = torch.cuda.get_device_properties(0)
    return (props.total_memory - torch.cuda.memory_reserved(0)) / 1024 ** 3


def _sdxl_available() -> bool:
    """True when USE_SDXL=true, CUDA present, and model on disk.

    VRAM is NOT checked here: _free_other_model_vram() runs before inference
    and frees cached models (NAFNet, DDColor, etc.), so the VRAM check here
    would incorrectly block SDXL when a previous job left models loaded.
    OOM at inference time is caught and surfaced as a clear error.
    """
    if os.environ.get("USE_SDXL", "").lower() not in ("1", "true", "yes"):
        return False
    if not torch.cuda.is_available():
        logger.info("SDXL skipped: CUDA not available")
        return False
    return _is_model_ready()


def download_model(progress_callback=None) -> None:
    """Download SDXL Inpainting model snapshot from HuggingFace Hub."""
    from huggingface_hub import snapshot_download

    local_dir = _local_cache_dir()
    local_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Downloading {_REPO_ID} → {local_dir} (~6.5 GB)…")
    if progress_callback:
        progress_callback(5)

    # Only fp16 variants — saves ~50% bandwidth/disk vs downloading both
    snapshot_download(
        repo_id=_REPO_ID,
        local_dir=str(local_dir),
        token=_hf_token(),
        allow_patterns=[
            "*.fp16.safetensors",
            "*.json",
            "*.txt",
            "tokenizer*/*.txt",
            "tokenizer*/*.json",
        ],
    )
    logger.info("SDXL Inpainting download complete")

    # Stock SDXL VAE produces NaN/Inf in fp16 → use the fp16-fix VAE
    vae_dir = _vae_cache_dir()
    vae_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Downloading {_VAE_FIX_REPO} → {vae_dir} (~165 MB)…")
    snapshot_download(
        repo_id=_VAE_FIX_REPO,
        local_dir=str(vae_dir),
        token=_hf_token(),
        allow_patterns=["*.safetensors", "*.json"],
    )
    logger.info("fp16-fix VAE download complete")

    if progress_callback:
        progress_callback(50)


def _strip_backend_from_syspath():
    """Return (saved_syspath, orig_cwd) — caller restores on exit.

    pyarrow scans sys.path entries on first import; the backend dir can have a
    Windows reparse point causing WinError 6714. We strip the backend path and
    move CWD to tempdir during the diffusers import.
    """
    import sys, tempfile
    orig_cwd = os.getcwd()
    abs_cwd = os.path.realpath(orig_cwd)
    saved = list(sys.path)
    clean = []
    for p in sys.path:
        try:
            r = os.path.realpath(p) if p else ""
        except OSError:
            r = p
        if r != abs_cwd:
            clean.append(p)
    sys.path[:] = clean
    os.chdir(tempfile.gettempdir())
    return saved, orig_cwd


def _restore_syspath(saved, orig_cwd):
    import sys
    sys.path[:] = saved
    try:
        os.chdir(orig_cwd)
    except OSError:
        pass


def _free_other_model_vram() -> None:
    """8 GB kartta SDXL'e yer acmak icin diger servislerin GPU model
    onbelleklerini bosaltir (NAFNet, DDColor vb.). Bosaltilan modeller bir
    sonraki kullanimda otomatik yeniden yuklenir."""
    try:
        from services import deblur_service
        with deblur_service._model_lock:
            if deblur_service._models:
                logger.info("SDXL oncesi NAFNet onbellegi bosaltiliyor")
                deblur_service._models.clear()
    except Exception:
        pass
    try:
        from services.model_cache import model_cache
        model_cache.clear_cache()
    except Exception:
        pass
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _get_pipeline():
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    if not _is_model_ready():
        download_model()

    saved, orig_cwd = _strip_backend_from_syspath()
    try:
        from diffusers import StableDiffusionXLInpaintPipeline, AutoencoderKL
    finally:
        _restore_syspath(saved, orig_cwd)

    local_dir = _local_cache_dir()
    vae_dir = _vae_cache_dir()
    logger.info(f"Loading SDXL Inpaint pipeline from {local_dir}…")
    t0 = time.time()

    # Load the fp16-fix VAE explicitly (stock SDXL VAE outputs NaN in fp16)
    fixed_vae = AutoencoderKL.from_pretrained(
        str(vae_dir),
        torch_dtype=torch.float16,
        local_files_only=True,
    )
    logger.info("fp16-fix VAE loaded")

    # Try fp16 variant first, fall back to default if variant files missing
    try:
        pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
            str(local_dir),
            vae=fixed_vae,
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
            local_files_only=True,
        )
    except Exception as exc:
        logger.info(f"fp16 variant not found ({exc}); loading default safetensors")
        pipe = StableDiffusionXLInpaintPipeline.from_pretrained(
            str(local_dir),
            vae=fixed_vae,
            torch_dtype=torch.float16,
            use_safetensors=True,
            local_files_only=True,
        )

    # 8 GB VRAM: tum pipeline'i (~6.6 GB) GPU'ya dikmek yerine model CPU
    # offload kullan — her asamada yalnizca gereken alt-model GPU'ya tasinir
    # (tepe ~5.8 GB). Tasma/paylasimli-bellek surunmesini onler.
    try:
        pipe.enable_model_cpu_offload()
        logger.info("SDXL: model CPU offload aktif (8 GB VRAM modu)")
    except Exception as exc:
        logger.warning(f"CPU offload kullanilamadi ({exc}); tam GPU moduna geciliyor")
        pipe = pipe.to("cuda")

    # Memory optimization for 8 GB VRAM:
    #   - VAE slicing only (decode VAE one image at a time). This is cheap and
    #     prevents the VAE from blowing past the available headroom.
    #   - Attention is handled by PyTorch 2.x SDPA (FlashAttention-2 backend
    #     when available), which is faster than attention_slicing and reaches
    #     near-xformers speed without the extra dependency.
    pipe.vae.enable_slicing()

    logger.info(f"SDXL pipeline ready in {time.time() - t0:.1f}s")
    _PIPELINE = pipe
    return _PIPELINE


def _unload_pipeline():
    global _PIPELINE
    if _PIPELINE is not None:
        del _PIPELINE
        _PIPELINE = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


def _resize_for_sdxl(image: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image, tuple[int, int]]:
    """Resize image+mask so the longest edge ≈ _TARGET_DIM, both divisible by 8."""
    orig_size = image.size
    w, h = orig_size

    scale = _TARGET_DIM / max(w, h)
    new_w = ((int(w * scale)) // 8) * 8
    new_h = ((int(h * scale)) // 8) * 8
    new_w = max(new_w, 512)
    new_h = max(new_h, 512)

    if (new_w, new_h) != (w, h):
        image = image.resize((new_w, new_h), Image.LANCZOS)
        mask = mask.resize((new_w, new_h), Image.NEAREST)

    return image, mask, orig_size


def _sdxl_inpaint(
    image: Image.Image,
    mask: Image.Image,
    prompt: str,
    negative_prompt: str,
    num_inference_steps: int,
    guidance_scale: float,
    strength: float,
    progress_callback=None,
) -> Image.Image:
    """Core inference; resizes, runs SDXL, resizes back to original size."""
    _free_other_model_vram()
    pipe = _get_pipeline()

    if mask.mode != "L":
        mask = mask.convert("L")
    if image.mode != "RGB":
        image = image.convert("RGB")

    image_resized, mask_resized, orig_size = _resize_for_sdxl(image, mask)

    if progress_callback:
        progress_callback(25)

    import random
    generator = torch.Generator(device="cuda").manual_seed(random.randint(0, 2**32 - 1))

    try:
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image_resized,
            mask_image=mask_resized,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            strength=strength,
            generator=generator,
        ).images[0]
    except torch.cuda.OutOfMemoryError:
        retry_dim = max(512, int(_TARGET_DIM * 0.75))
        logger.warning(f"CUDA OOM during SDXL inference — retrying at {retry_dim}px")
        gc.collect()
        torch.cuda.empty_cache()
        w, h = image_resized.size
        scale = retry_dim / max(w, h)
        new_w = ((int(w * scale)) // 8) * 8
        new_h = ((int(h * scale)) // 8) * 8
        image_small = image_resized.resize((new_w, new_h), Image.LANCZOS)
        mask_small = mask_resized.resize((new_w, new_h), Image.NEAREST)
        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image=image_small,
            mask_image=mask_small,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            strength=strength,
            generator=generator,
        ).images[0]

    if progress_callback:
        progress_callback(90)

    if result.size != orig_size:
        result = result.resize(orig_size, Image.LANCZOS)
    return result


def sdxl_inpaint_from_paths(
    input_path: str,
    mask_path: str,
    output_path: str,
    prompt: str = _OBJECT_REMOVE_PROMPT,
    negative_prompt: str = _OBJECT_REMOVE_NEGATIVE,
    num_inference_steps: int = _DEFAULT_STEPS,
    guidance_scale: float = 8.0,
    strength: float = 0.99,
    progress_callback=None,
) -> float:
    """
    File-path wrapper used by inpaint_service for INPAINT job type (object removal).
    mask_path: grayscale PNG — white = fill area, black = keep.
    Returns elapsed seconds.
    """
    start = time.time()

    img_bgr = cv2.imread(input_path)
    if img_bgr is None:
        raise ValueError(f"Cannot load image: {input_path}")

    mask_gray = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask_gray is None:
        raise ValueError(f"Cannot load mask: {mask_path}")

    if mask_gray.shape[:2] != img_bgr.shape[:2]:
        mask_gray = cv2.resize(
            mask_gray, (img_bgr.shape[1], img_bgr.shape[0]),
            interpolation=cv2.INTER_NEAREST,
        )

    _, mask_bin = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)
    masked_px = int(np.sum(mask_bin > 0))
    logger.info(f"SDXL Inpaint: {img_bgr.shape[1]}x{img_bgr.shape[0]}, mask={masked_px}px")

    if masked_px == 0:
        cv2.imwrite(output_path, img_bgr)
        return time.time() - start

    if progress_callback:
        progress_callback(15)

    pil_img = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    pil_mask = Image.fromarray(mask_bin)

    result_pil = _sdxl_inpaint(
        pil_img, pil_mask,
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        strength=strength,
        progress_callback=progress_callback,
    )

    result_bgr = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, result_bgr)
    elapsed = time.time() - start
    logger.info(f"SDXL Inpaint done in {elapsed:.1f}s → {output_path}")
    return elapsed


def sdxl_inpaint_auto(
    input_path: str,
    output_path: str,
    threshold: int = 240,
    save_mask_debug: bool = False,
    prompt: str = _FACE_AUTO_PROMPT,
    negative_prompt: str = _FACE_AUTO_NEGATIVE,
    num_inference_steps: int = 40,
    guidance_scale: float = 9.0,
    strength: float = 0.99,
    progress_callback=None,
) -> float:
    """
    Auto-detect damaged/missing areas and fill with SDXL.
    Used by RESTORE_DAMAGE job type. Reuses flux_fill_service._build_damage_mask
    (alpha channel + bright blobs + scratch detection).
    """
    start = time.time()

    img_bgr = cv2.imread(input_path)
    if img_bgr is None:
        raise ValueError(f"Cannot load image: {input_path}")

    if progress_callback:
        progress_callback(10)

    damage_mask = _build_damage_mask(img_bgr, input_path, threshold=threshold)

    coverage = np.sum(damage_mask > 0) / damage_mask.size * 100
    logger.info(f"SDXL auto — damage mask coverage: {coverage:.2f}%")

    if save_mask_debug:
        debug_path = str(Path(output_path).with_name(Path(output_path).stem + "_mask.png"))
        cv2.imwrite(debug_path, damage_mask)
        overlay = img_bgr.copy()
        overlay[damage_mask > 0] = [0, 0, 255]
        blended = cv2.addWeighted(img_bgr, 0.5, overlay, 0.5, 0)
        overlay_path = str(Path(output_path).with_name(Path(output_path).stem + "_mask_overlay.jpg"))
        cv2.imwrite(overlay_path, blended)
        logger.info(f"Mask debug saved: {debug_path}, {overlay_path}")

    if coverage < 0.01:
        logger.info("No significant damage detected — copying input to output unchanged")
        cv2.imwrite(output_path, img_bgr)
        if progress_callback:
            progress_callback(95)
        return time.time() - start

    if progress_callback:
        progress_callback(15)

    pil_img = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
    pil_mask = Image.fromarray(damage_mask)

    result_pil = _sdxl_inpaint(
        pil_img, pil_mask,
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        strength=strength,
        progress_callback=progress_callback,
    )

    result_bgr = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)

    # Seamless blending: orijinal piksel degerlerini maske disinda koru,
    # maske sinirinda Poisson cloning ile yumusak gecis yap.
    result_bgr = _blend_inpaint_result(img_bgr, result_bgr, damage_mask)

    cv2.imwrite(output_path, result_bgr)
    elapsed = time.time() - start
    logger.info(f"SDXL Auto Fill done in {elapsed:.1f}s → {output_path}")
    return elapsed
