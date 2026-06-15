"""
Old photo damage restoration service.
Priority: SDXL Inpainting → Gemini API → LaMa → OpenCV TELEA.
"""
import os
import time
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


def _sdxl_available() -> bool:
    try:
        from .sdxl_inpaint_service import _sdxl_available as _check
        return _check()
    except Exception as exc:
        logger.debug(f"SDXL availability check failed: {exc}")
        return False


def _gemini_available() -> bool:
    try:
        from services.gemini_image_engine import gemini_configured
        return gemini_configured()
    except Exception:
        return False


def _detect_damage_mask(gray: np.ndarray) -> np.ndarray:
    """
    Detect scratches, dust, and missing (white) areas.
    Returns binary mask: 255 = damaged, 0 = clean.
    """
    # Bright thin scratch lines via top-hat
    kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))
    kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
    tophat_v = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel_v)
    tophat_h = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel_h)
    scratch_mask = cv2.add(tophat_v, tophat_h)
    _, scratch_bin = cv2.threshold(scratch_mask, 30, 255, cv2.THRESH_BINARY)

    # Dust / black spots
    kernel_dot = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel_dot)
    _, dust_bin = cv2.threshold(blackhat, 25, 255, cv2.THRESH_BINARY)

    # Large missing / torn areas (white blobs)
    _, white_bin = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    kernel_close = np.ones((7, 7), np.uint8)
    white_bin = cv2.morphologyEx(white_bin, cv2.MORPH_CLOSE, kernel_close, iterations=3)
    white_bin = cv2.dilate(white_bin, kernel_close, iterations=2)

    combined = cv2.add(cv2.add(scratch_bin, dust_bin), white_bin)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    combined = cv2.dilate(combined, kernel_dilate, iterations=2)
    return combined


def restore_damaged_photo(
    input_path: str,
    output_path: str,
    progress_callback=None,
) -> float:
    """
    Restore an old/damaged photograph.
    Priority: Gemini API → FLUX.1-Fill-dev (GPU, ≥7 GB VRAM) → LaMa → OpenCV TELEA.
    """
    start = time.time()
    if progress_callback:
        progress_callback(8)

    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Cannot load image: {input_path}")

    orig_h, orig_w = img.shape[:2]
    logger.info(f"Damage restore: {orig_w}x{orig_h}")

    # ── TEK MOTOR: SDXL Inpainting (offline, GPU, ~1-3 min) ─────────────────
    # Fallback zinciri (Gemini/LaMa/OpenCV) bilinçli olarak devre dışı:
    # SDXL kullanılamıyorsa iş sessizce düşük kaliteye düşmek yerine net bir
    # hata ile FAILED olur. Zinciri geri açmak için SDXL_ONLY=false yap.
    sdxl_only = os.environ.get("SDXL_ONLY", "false").lower() in ("1", "true", "yes")
    if _sdxl_available():
        try:
            from .sdxl_inpaint_service import sdxl_inpaint_auto
            logger.info("Using SDXL Inpainting for damage restoration")
            if progress_callback:
                progress_callback(10)
            elapsed = sdxl_inpaint_auto(
                input_path, output_path,
                progress_callback=progress_callback,
            )
            logger.info(f"SDXL restore done in {elapsed:.1f}s")
            return time.time() - start
        except Exception as e:
            if sdxl_only:
                raise RuntimeError(f"SDXL inpaint hatasi: {e}") from e
            logger.warning(f"SDXL restore failed ({e}), falling back to Gemini/FLUX/LaMa")
    elif sdxl_only:
        raise RuntimeError(
            "SDXL kullanilamiyor (USE_SDXL=true, CUDA ve "
            "ai_models/sdxl-inpainting dosyalari gerekli). Servisleri "
            "AYU-BASLAT.bat ile yeniden baslatmayi dene."
        )

    # ── Tier 2: Gemini API ───────────────────────────────────────────────────
    if _gemini_available():
        try:
            from services.gemini_image_engine import enhance_image_with_gemini
            logger.info("Using Gemini API for damage restoration")
            if progress_callback:
                progress_callback(12)
            elapsed = enhance_image_with_gemini(
                input_path=input_path,
                output_path=output_path,
                mode="restore",
                fallback_mode="restore",
                progress_callback=progress_callback,
            )
            logger.info(f"Gemini restore done in {elapsed:.1f}s")
            return time.time() - start
        except Exception as e:
            logger.warning(f"Gemini restore failed ({e}), falling back to FLUX/LaMa")

    # ── Tier 3: detect damage mask for LaMa / OpenCV ────────────────────────
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    damage_mask = _detect_damage_mask(gray)
    damaged_pixels = int(np.sum(damage_mask > 0))
    logger.info(f"Detected {damaged_pixels} damaged pixels ({damaged_pixels / (orig_w * orig_h) * 100:.1f}%)")

    if progress_callback:
        progress_callback(35)

    if damaged_pixels > 0:
        try:
            from simple_lama_inpainting import SimpleLama
            from PIL import Image as PILImage

            pil_img = PILImage.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            pil_mask = PILImage.fromarray(damage_mask)
            simple_lama = SimpleLama()
            result_pil = simple_lama(pil_img, pil_mask)
            img = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)
            logger.info("Damage inpainted with LaMa")
        except Exception as e:
            logger.info(f"LaMa not available ({e}), using OpenCV TELEA")
            img = cv2.inpaint(img, damage_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
    else:
        logger.info("No significant damage detected, skipping inpaint")

    if progress_callback:
        progress_callback(65)

    _post_process(img, output_path, progress_callback)
    return time.time() - start


def _post_process(img: np.ndarray, output_path: str, progress_callback=None):
    """Denoise + contrast enhancement, then save."""
    img = cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)

    if progress_callback:
        progress_callback(85)

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    img = cv2.cvtColor(cv2.merge([l_ch, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    blurred = cv2.GaussianBlur(img, (0, 0), 1.0)
    img = cv2.addWeighted(img, 1.3, blurred, -0.3, 0)

    if progress_callback:
        progress_callback(95)

    cv2.imwrite(output_path, img)
