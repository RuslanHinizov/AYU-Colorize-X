"""
Object removal / inpainting service.

Oncelik: LaMa → OpenCV TELEA.
LaMa nesne SILME icin tasarlanmistir: maskelenen alani cevredeki arka planla
dikissiz doldurur, YENI nesne URETMEZ. SDXL gibi uretken difuzyon modelleri
silme yerine bazen yeni bir nesne uydurur (orn. roket yerine sandalye), bu
yuzden object-removal'da varsayilan olarak kullanilmaz. Gercekten uretken
doldurma istenirse INPAINT_USE_SDXL=true ile acilabilir.

mask convention: white (255) = area to remove/fill, black (0) = keep.
"""
import os
import time
import logging
import cv2
import numpy as np
from PIL import Image as PILImage

logger = logging.getLogger(__name__)


def _sdxl_available() -> bool:
    if os.environ.get("INPAINT_USE_SDXL", "false").lower() not in ("1", "true", "yes"):
        return False
    try:
        from .sdxl_inpaint_service import _sdxl_available as _check
        return _check()
    except Exception as exc:
        logger.debug(f"SDXL availability check failed: {exc}")
        return False


def inpaint_image(
    input_path: str,
    mask_path: str,
    output_path: str,
    progress_callback=None,
) -> float:
    """
    Remove object defined by mask from image.
    mask_path: grayscale PNG — white = remove, black = keep.
    """
    start = time.time()
    if progress_callback:
        progress_callback(10)

    img_bgr = cv2.imread(input_path)
    if img_bgr is None:
        raise ValueError(f"Cannot load image: {input_path}")

    mask_gray = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask_gray is None:
        raise ValueError(f"Cannot load mask: {mask_path}")

    if mask_gray.shape[:2] != img_bgr.shape[:2]:
        mask_gray = cv2.resize(mask_gray, (img_bgr.shape[1], img_bgr.shape[0]),
                               interpolation=cv2.INTER_NEAREST)

    _, mask_bin = cv2.threshold(mask_gray, 127, 255, cv2.THRESH_BINARY)

    masked_px = int(np.sum(mask_bin > 0))
    logger.info(f"Inpaint: {img_bgr.shape[1]}x{img_bgr.shape[0]}, mask={masked_px}px")

    if masked_px == 0:
        cv2.imwrite(output_path, img_bgr)
        return time.time() - start

    if progress_callback:
        progress_callback(20)

    # ── Tier 1: SDXL Inpainting (offline, GPU, ~1-3 min) ─────────────────────
    if _sdxl_available():
        try:
            from .sdxl_inpaint_service import sdxl_inpaint_from_paths
            logger.info("Using SDXL Inpainting for object removal")
            elapsed = sdxl_inpaint_from_paths(
                input_path, mask_path, output_path,
                progress_callback=progress_callback,
            )
            if progress_callback:
                progress_callback(95)
            return elapsed
        except Exception as e:
            logger.warning(f"SDXL failed ({e}), falling back to FLUX/LaMa")

    # ── Tier 2: LaMa ─────────────────────────────────────────────────────────
    try:
        from simple_lama_inpainting import SimpleLama

        pil_img = PILImage.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        pil_mask = PILImage.fromarray(mask_bin)

        if progress_callback:
            progress_callback(40)

        simple_lama = SimpleLama()

        if progress_callback:
            progress_callback(60)

        result_pil = simple_lama(pil_img, pil_mask)

        if progress_callback:
            progress_callback(88)

        result_bgr = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)
        cv2.imwrite(output_path, result_bgr)
        logger.info(f"LaMa inpaint done in {time.time() - start:.2f}s")

    except Exception as e:
        # ── Tier 3: OpenCV TELEA fallback ────────────────────────────────────
        logger.warning(f"LaMa failed ({e}), falling back to OpenCV TELEA")
        if progress_callback:
            progress_callback(60)
        result = cv2.inpaint(img_bgr, mask_bin, inpaintRadius=5, flags=cv2.INPAINT_TELEA)
        cv2.imwrite(output_path, result)
        logger.info(f"OpenCV inpaint done in {time.time() - start:.2f}s")

    if progress_callback:
        progress_callback(95)
    return time.time() - start
