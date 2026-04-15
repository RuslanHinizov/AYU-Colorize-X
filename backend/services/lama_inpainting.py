"""
LaMa Inpainting Service - Çizik ve Kayıp Alan Doldurma

LaMa (Large Mask Inpainting) - Samsung AI tarafından geliştirilen
en iyi inpainting modellerinden biri.

Kullanım alanları:
- Çizik onarımı
- Yırtık/kayıp alan doldurma
- İstenmeyen nesne silme
"""
import os
import gc
import logging
import numpy as np
from pathlib import Path
from typing import Optional
import torch
import cv2
from PIL import Image

logger = logging.getLogger(__name__)

# LaMa model yolu
BACKEND_DIR = Path(__file__).parent.parent
LAMA_MODEL_PATH = BACKEND_DIR / "ai_models" / "lama" / "big-lama.pt"


def clear_gpu():
    """GPU belleğini temizle"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def detect_scratches(image: np.ndarray, sensitivity: float = 0.5) -> np.ndarray:
    """
    Görüntüdeki çizikleri otomatik tespit et
    
    Args:
        image: BGR görüntü
        sensitivity: Hassasiyet (0-1, yüksek = daha fazla çizik tespit)
    
    Returns:
        Çizik maskesi (beyaz = çizik)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Canny edge detection
    low_threshold = int(50 * (1 - sensitivity))
    high_threshold = int(150 * (1 - sensitivity))
    edges = cv2.Canny(gray, low_threshold, high_threshold)
    
    # Morphological operations to connect edges
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Hough Line Transform ile çizgileri tespit et
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=30, minLineLength=20, maxLineGap=5)
    
    # Çizik maskesi oluştur
    mask = np.zeros_like(gray)
    
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Çizgi kalınlığını hesapla (uzunluğa göre)
            length = np.sqrt((x2-x1)**2 + (y2-y1)**2)
            thickness = max(2, min(5, int(length / 50)))
            cv2.line(mask, (x1, y1), (x2, y2), 255, thickness)
    
    # Maskeyi genişlet
    mask = cv2.dilate(mask, kernel, iterations=2)
    
    return mask


def detect_missing_areas(image: np.ndarray, threshold: int = 245) -> np.ndarray:
    """
    Kayıp/yırtık alanları tespit et (aşırı beyaz veya koyu alanlar)
    
    Args:
        image: BGR görüntü
        threshold: Beyaz eşik değeri
    
    Returns:
        Kayıp alan maskesi
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Beyaz alanlar (yırtık/kayıp)
    _, white_mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    
    # Çok koyu alanlar (hasar)
    _, dark_mask = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY_INV)
    
    # Birleştir
    mask = cv2.bitwise_or(white_mask, dark_mask)
    
    # Küçük gürültüleri temizle
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Maskeyi biraz genişlet
    mask = cv2.dilate(mask, kernel, iterations=1)
    
    return mask


def opencv_inpaint(image: np.ndarray, mask: np.ndarray, method: str = "telea") -> np.ndarray:
    """
    OpenCV inpainting (LaMa yoksa fallback)
    
    Args:
        image: BGR görüntü
        mask: İnpaint maskesi
        method: "telea" veya "ns" (Navier-Stokes)
    
    Returns:
        İnpaint edilmiş görüntü
    """
    if method == "telea":
        return cv2.inpaint(image, mask, 3, cv2.INPAINT_TELEA)
    else:
        return cv2.inpaint(image, mask, 3, cv2.INPAINT_NS)


def lama_inpaint(image: np.ndarray, mask: np.ndarray, device: str = "cuda") -> np.ndarray:
    """
    LaMa model ile inpainting
    
    Args:
        image: RGB görüntü (0-255)
        mask: İnpaint maskesi (0-255, beyaz = inpaint edilecek)
        device: cuda veya cpu
    
    Returns:
        İnpaint edilmiş görüntü
    """
    # LaMa model kontrolü
    if not LAMA_MODEL_PATH.exists():
        logger.warning("LaMa model not found, using OpenCV inpainting")
        # BGR'ye çevir ve OpenCV kullan
        bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        result = opencv_inpaint(bgr, mask)
        return cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    
    try:
        # LaMa modelini yükle
        from simple_lama_inpainting import SimpleLama
        
        lama = SimpleLama()
        
        # PIL Image'e çevir
        pil_image = Image.fromarray(image)
        pil_mask = Image.fromarray(mask)
        
        # İnpaint
        result = lama(pil_image, pil_mask)
        
        clear_gpu()
        
        return np.array(result)
        
    except ImportError:
        logger.warning("simple-lama-inpainting not installed, using OpenCV")
        bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        result = opencv_inpaint(bgr, mask)
        return cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    except Exception as e:
        logger.error(f"LaMa inpainting failed: {e}")
        bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        result = opencv_inpaint(bgr, mask)
        return cv2.cvtColor(result, cv2.COLOR_BGR2RGB)


def auto_scratch_repair(
    input_path: str,
    output_path: str,
    sensitivity: float = 0.5,
    device: str = "cuda"
) -> None:
    """
    Otomatik çizik onarımı
    
    Args:
        input_path: Giriş görüntüsü
        output_path: Çıkış görüntüsü
        sensitivity: Çizik tespit hassasiyeti (0-1)
        device: cuda veya cpu
    """
    logger.info(f"Auto scratch repair: {input_path}")
    
    # Görüntüyü yükle
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError(f"Could not load image: {input_path}")
    
    # Çizikleri tespit et
    scratch_mask = detect_scratches(image, sensitivity)
    
    # Çizik yoksa direkt kopyala
    if np.sum(scratch_mask) == 0:
        logger.info("No scratches detected")
        cv2.imwrite(output_path, image)
        return
    
    logger.info(f"Detected scratches, mask coverage: {np.sum(scratch_mask > 0) / scratch_mask.size * 100:.2f}%")
    
    # RGB'ye çevir
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # İnpaint
    result = lama_inpaint(rgb, scratch_mask, device)
    
    # BGR'ye çevir ve kaydet
    bgr = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, bgr)
    
    logger.info(f"Scratch repair complete: {output_path}")


def auto_inpaint_missing(
    input_path: str,
    output_path: str,
    threshold: int = 245,
    device: str = "cuda"
) -> None:
    """
    Otomatik kayıp alan doldurma
    
    Args:
        input_path: Giriş görüntüsü
        output_path: Çıkış görüntüsü
        threshold: Beyaz alan eşiği
        device: cuda veya cpu
    """
    logger.info(f"Auto inpaint missing areas: {input_path}")
    
    # Görüntüyü yükle
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError(f"Could not load image: {input_path}")
    
    # Kayıp alanları tespit et
    missing_mask = detect_missing_areas(image, threshold)
    
    # Kayıp alan yoksa direkt kopyala
    if np.sum(missing_mask) == 0:
        logger.info("No missing areas detected")
        cv2.imwrite(output_path, image)
        return
    
    logger.info(f"Detected missing areas, mask coverage: {np.sum(missing_mask > 0) / missing_mask.size * 100:.2f}%")
    
    # RGB'ye çevir
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # İnpaint
    result = lama_inpaint(rgb, missing_mask, device)
    
    # BGR'ye çevir ve kaydet
    bgr = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, bgr)
    
    logger.info(f"Inpainting complete: {output_path}")


def inpaint_with_mask(
    input_path: str,
    mask_path: str,
    output_path: str,
    device: str = "cuda"
) -> None:
    """
    Verilen maske ile inpainting
    
    Args:
        input_path: Giriş görüntüsü
        mask_path: Maske görüntüsü (beyaz = inpaint edilecek)
        output_path: Çıkış görüntüsü
        device: cuda veya cpu
    """
    logger.info(f"Inpaint with mask: {input_path}")
    
    # Görüntüleri yükle
    image = cv2.imread(input_path)
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    
    if image is None:
        raise ValueError(f"Could not load image: {input_path}")
    if mask is None:
        raise ValueError(f"Could not load mask: {mask_path}")
    
    # Boyutları eşitle
    if mask.shape[:2] != image.shape[:2]:
        mask = cv2.resize(mask, (image.shape[1], image.shape[0]))
    
    # RGB'ye çevir
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # İnpaint
    result = lama_inpaint(rgb, mask, device)
    
    # BGR'ye çevir ve kaydet
    bgr = cv2.cvtColor(result, cv2.COLOR_RGB2BGR)
    cv2.imwrite(output_path, bgr)
    
    logger.info(f"Inpainting with mask complete: {output_path}")
