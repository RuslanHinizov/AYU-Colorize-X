"""
Deblur and denoise service — NAFNet (AI) tabanli.

NAFNet: "Simple Baselines for Image Restoration" (MIT, megvii-research).
  deblur  — NAFNet-REDS-width64  (hareket/odak bulanikligi giderme)
  denoise — NAFNet-SIDD-width64  (gercek dunya gurultu temizleme)
  both    — once denoise (SIDD), sonra deblur (REDS)

Agirliklar: backend/ai_models/NAFNet-REDS-width64.pth ve NAFNet-SIDD-width64.pth
Buyuk goruntuler VRAM tasmasin diye 512px karolarla (tile) islenir.

strength (0.5..2.0): AI ciktisi ile orijinalin karisim orani.
  <=1.0  -> out = lerp(orijinal, AI, strength)
  >1.0   -> tam AI ciktisi + hafif ek keskinlestirme (unsharp)

NAFNET_ONLY=true (varsayilan): model yoksa is net hata ile FAILED olur.
NAFNET_ONLY=false: eski OpenCV yontemine sessizce duser.
"""
import os
import time
import logging
import threading
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).parent.parent
MODELS_DIR = BACKEND_DIR / "ai_models"

_TILE = 512
_TILE_OVERLAP = 32

_models = {}
_model_lock = threading.Lock()


def _models_dir() -> Path:
    d = os.environ.get("AI_MODELS_DIR", "")
    if d:
        return Path(d)
    try:
        from config import settings
        if settings.AI_MODELS_DIR:
            return Path(settings.AI_MODELS_DIR)
    except Exception:
        pass
    return MODELS_DIR


_NAFNET_CONFIGS = {
    # Resmi test yml'leri ile birebir (megvii-research/NAFNet)
    "deblur": {
        "file": "NAFNet-REDS-width64.pth",
        "local": True,   # NAFNetLocal (TLC) — REDS test config'i boyle
        "width": 64, "enc": [1, 1, 1, 28], "mid": 1, "dec": [1, 1, 1, 1],
    },
    "denoise": {
        "file": "NAFNet-SIDD-width64.pth",
        "local": False,  # duz NAFNet — SIDD test config'i boyle
        "width": 64, "enc": [2, 2, 4, 8], "mid": 12, "dec": [2, 2, 2, 2],
    },
}


def _get_device():
    import torch
    return torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")


def _load_nafnet(task: str):
    """Load and cache a NAFNet model for 'deblur' or 'denoise'."""
    import torch
    from services.nafnet import NAFNet, NAFNetLocal

    cfg = _NAFNET_CONFIGS[task]
    device = _get_device()
    cache_key = f"{task}_{device.type}"

    with _model_lock:
        if cache_key in _models:
            return _models[cache_key], device

        weight_path = _models_dir() / cfg["file"]
        if not weight_path.is_file():
            raise RuntimeError(
                f"NAFNet model dosyasi yok: {weight_path}. "
                f"https://huggingface.co/spaces/chuxiaojie/NAFNet adresinden "
                f"{cfg['file']} dosyasini ai_models klasorune indir."
            )

        logger.info(f"Loading NAFNet-{task} from {weight_path} on {device}")
        cls = NAFNetLocal if cfg["local"] else NAFNet
        net = cls(
            img_channel=3,
            width=cfg["width"],
            enc_blk_nums=cfg["enc"],
            middle_blk_num=cfg["mid"],
            dec_blk_nums=cfg["dec"],
        )
        ckpt = torch.load(str(weight_path), map_location="cpu", weights_only=True)
        state = ckpt.get("params", ckpt) if isinstance(ckpt, dict) else ckpt
        net.load_state_dict(state, strict=True)
        net.eval()
        net.to(device)

        _models[cache_key] = net
        logger.info(f"NAFNet-{task} ready on {device}")
        return net, device


def _run_nafnet_tiled(net, device, img_bgr: np.ndarray, progress_callback=None,
                      progress_base: int = 0, progress_span: int = 80) -> np.ndarray:
    """Run NAFNet over a BGR uint8 image using overlapping tiles."""
    import torch

    h, w = img_bgr.shape[:2]
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    out = np.zeros_like(rgb)
    weight = np.zeros((h, w, 1), dtype=np.float32)

    step = _TILE - 2 * _TILE_OVERLAP
    ys = list(range(0, max(h - _TILE, 0) + 1, step)) or [0]
    xs = list(range(0, max(w - _TILE, 0) + 1, step)) or [0]
    if ys[-1] + _TILE < h:
        ys.append(h - _TILE)
    if xs[-1] + _TILE < w:
        xs.append(w - _TILE)
    ys = [max(0, y) for y in ys]
    xs = [max(0, x) for x in xs]

    total = len(ys) * len(xs)
    done = 0

    with torch.no_grad():
        for y in ys:
            for x in xs:
                y2, x2 = min(y + _TILE, h), min(x + _TILE, w)
                tile = rgb[y:y2, x:x2]
                t = torch.from_numpy(tile.transpose(2, 0, 1)).unsqueeze(0).to(device)
                pred = net(t)
                pred = pred.squeeze(0).clamp(0, 1).cpu().numpy().transpose(1, 2, 0)

                out[y:y2, x:x2] += pred
                weight[y:y2, x:x2] += 1.0

                done += 1
                if progress_callback:
                    progress_callback(progress_base + int(done / total * progress_span))

    out = out / np.maximum(weight, 1e-6)
    result = cv2.cvtColor((out * 255.0).round().astype(np.uint8), cv2.COLOR_RGB2BGR)
    return result


def _apply_strength(original: np.ndarray, ai_output: np.ndarray, strength: float) -> np.ndarray:
    """Blend AI output with original by strength; >1.0 adds mild extra sharpening."""
    strength = max(0.3, min(3.0, strength))
    blend = min(strength, 1.0)
    mixed = cv2.addWeighted(ai_output, blend, original, 1.0 - blend, 0)
    if strength > 1.0:
        amount = 0.4 * (strength - 1.0)
        blurred = cv2.GaussianBlur(mixed, (0, 0), 1.5)
        mixed = cv2.addWeighted(mixed, 1.0 + amount, blurred, -amount, 0)
    return mixed


def _deblur_opencv_legacy(img: np.ndarray, mode: str, strength: float,
                          progress_callback=None) -> np.ndarray:
    """Eski OpenCV yolu — yalnizca NAFNET_ONLY=false iken yedek olarak."""
    strength = max(0.3, min(3.0, strength))
    if mode in ("denoise", "both"):
        h_val = max(3, int(7 * strength))
        img = cv2.fastNlMeansDenoisingColored(img, None, h_val, h_val, 7, 21)
    if progress_callback:
        progress_callback(50)
    if mode in ("deblur", "both"):
        amount = 0.8 * strength
        blurred = cv2.GaussianBlur(img, (0, 0), 1.5)
        img = cv2.addWeighted(img, 1.0 + amount, blurred, -amount, 0)
    return img


def deblur_image(
    input_path: str,
    output_path: str,
    mode: str = "both",
    strength: float = 1.0,
    progress_callback=None,
) -> float:
    """
    AI (NAFNet) ile deblur/denoise.
    mode: deblur | denoise | both
    strength: 0.5 (hafif) .. 2.0 (agresif), 1.0 = tam AI ciktisi
    """
    start = time.time()
    if progress_callback:
        progress_callback(5)

    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Cannot load image: {input_path}")
    original = img.copy()

    nafnet_only = os.environ.get("NAFNET_ONLY", "true").lower() in ("1", "true", "yes")

    try:
        if mode == "both":
            # once gurultu temizle (SIDD), sonra netlestir (REDS)
            net_dn, device = _load_nafnet("denoise")
            if progress_callback:
                progress_callback(10)
            img = _run_nafnet_tiled(net_dn, device, img, progress_callback, 10, 40)
            net_db, device = _load_nafnet("deblur")
            img = _run_nafnet_tiled(net_db, device, img, progress_callback, 50, 35)
        else:
            task = "deblur" if mode == "deblur" else "denoise"
            net, device = _load_nafnet(task)
            if progress_callback:
                progress_callback(10)
            img = _run_nafnet_tiled(net, device, img, progress_callback, 10, 75)

        img = _apply_strength(original, img, strength)
        logger.info(f"NAFNet {mode} done (strength={strength})")
    except Exception as exc:
        if nafnet_only:
            raise RuntimeError(f"NAFNet {mode} hatasi: {exc}") from exc
        logger.warning(f"NAFNet failed ({exc}); falling back to OpenCV")
        img = _deblur_opencv_legacy(original, mode, strength, progress_callback)

    if progress_callback:
        progress_callback(90)
    cv2.imwrite(output_path, img)
    if progress_callback:
        progress_callback(95)
    return time.time() - start
