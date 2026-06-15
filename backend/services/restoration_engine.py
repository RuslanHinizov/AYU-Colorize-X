"""
Photo Restoration Engine — CodeFormer pipeline.
CodeFormer: yüzleri restore eder, Real-ESRGAN arka plan için bg_upsampler olarak kullanılır.
Bu resmi CodeFormer pipeline'ıdır.
"""
import os
import sys
import time
import cv2
import numpy as np
import torch
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).parent.parent
MODELS_DIR = BACKEND_DIR / "ai_models"
CODEFORMER_DIR = BACKEND_DIR / "CodeFormer"
CODEFORMER_WEIGHTS_DIR = CODEFORMER_DIR / "weights"

_cached_models = {}


def get_device(device_str: str = "cpu") -> torch.device:
    if device_str.lower() == "gpu" and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def _setup_codeformer_paths():
    """Add CodeFormer repo to sys.path — must come BEFORE ddcolor_repo.

    ddcolor_repo ships its own stripped basicsr that lacks get_device,
    realesrgan_utils, etc.  CodeFormer ships the full basicsr.
    We ensure CodeFormer comes first AND evict any ddcolor_repo basicsr
    that may already be cached in sys.modules so Python re-imports from
    CodeFormer's copy.
    """
    cf_path = str(CODEFORMER_DIR)
    ddcolor_path = str(BACKEND_DIR / "ddcolor_repo")

    # Ensure CodeFormer is first in sys.path
    if cf_path in sys.path:
        sys.path.remove(cf_path)
    sys.path.insert(0, cf_path)

    # If ddcolor_repo's basicsr is cached, remove it so CodeFormer's wins
    if ddcolor_path in sys.path:
        # Check if the cached basicsr comes from ddcolor_repo
        basicsr_mod = sys.modules.get('basicsr')
        if basicsr_mod is not None:
            mod_file = getattr(basicsr_mod, '__file__', '') or ''
            if ddcolor_path in mod_file:
                # Evict all basicsr.* modules so they reload from CodeFormer
                stale = [k for k in sys.modules if k == 'basicsr' or k.startswith('basicsr.')]
                for k in stale:
                    del sys.modules[k]


def _load_bg_upsampler(device: torch.device, scale: int = 2):
    """Load Real-ESRGAN as background upsampler. Supports 2x and 4x."""
    scale = 4 if scale >= 4 else 2
    cache_key = f"bg_upsampler_{device.type}_{scale}x"
    if cache_key in _cached_models:
        return _cached_models[cache_key]

    _setup_codeformer_paths()
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from basicsr.utils.realesrgan_utils import RealESRGANer

    model_filename = f"RealESRGAN_x{scale}plus.pth"
    model_path = MODELS_DIR / model_filename
    if not model_path.exists():
        model_path = CODEFORMER_WEIGHTS_DIR / "realesrgan" / model_filename
    if not model_path.exists():
        # fallback to x2 if x4 not found
        if scale == 4:
            logger.warning(f"{model_filename} not found, falling back to x2")
            return _load_bg_upsampler(device, scale=2)
        logger.warning(f"{model_filename} not found, no bg upsampling")
        return None

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=scale)
    use_half = device.type == "cuda"
    upsampler = RealESRGANer(
        scale=scale,
        model_path=str(model_path),
        model=model,
        tile=400,
        tile_pad=40,
        pre_pad=0,
        half=use_half,
    )
    _cached_models[cache_key] = upsampler
    logger.info(f"BG upsampler (Real-ESRGAN x{scale}) loaded from {model_path}")
    return upsampler


def upscale_realesrgan(image: np.ndarray, device: torch.device, scale: int = 2) -> np.ndarray:
    """Upscale a BGR image with Real-ESRGAN (2x or 4x), with a deterministic OpenCV fallback."""
    if image is None:
        raise ValueError("Input image is empty")

    upsampler = _load_bg_upsampler(device, scale=scale)
    if upsampler is None:
        logger.warning("Real-ESRGAN weights unavailable; using Lanczos fallback")
        return cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_LANCZOS4,
        )

    try:
        output, _ = upsampler.enhance(image, outscale=scale)
        return output
    except Exception as exc:
        logger.warning("Real-ESRGAN failed; using Lanczos fallback: %s", exc)
        return cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_LANCZOS4,
        )


def _load_codeformer_net(device: torch.device):
    """Load official CodeFormer network."""
    cache_key = f"codeformer_net_{device.type}"
    if cache_key in _cached_models:
        return _cached_models[cache_key]

    _setup_codeformer_paths()
    from basicsr.utils.registry import ARCH_REGISTRY

    weight_path = CODEFORMER_WEIGHTS_DIR / "CodeFormer" / "codeformer.pth"
    if not weight_path.exists():
        weight_path = MODELS_DIR / "codeformer.pth"
    if not weight_path.exists():
        raise FileNotFoundError("CodeFormer weights not found")

    net = ARCH_REGISTRY.get('CodeFormer')(
        dim_embd=512, codebook_size=1024, n_head=8, n_layers=9,
        connect_list=['32', '64', '128', '256'],
    ).to(device)
    checkpoint = torch.load(str(weight_path), map_location='cpu', weights_only=False)['params_ema']
    net.load_state_dict(checkpoint)
    net.eval()
    _cached_models[cache_key] = net
    logger.info(f"CodeFormer loaded from {weight_path}")
    return net


def _force_facelib_device(device: torch.device) -> None:
    """Force CodeFormer's facelib modules to honor the requested device.

    RetinaFace keeps a module-level `device` global and uses it during
    detection, even when FaceRestoreHelper is constructed with CPU. Without
    this patch, CPU restoration can still feed CUDA tensors into CPU weights.
    """
    try:
        from facelib.detection.retinaface import retinaface as retinaface_module
        retinaface_module.device = device
    except Exception as exc:
        logger.warning("Could not override facelib runtime device: %s", exc)


def restore_photo(
    input_path: str,
    output_path: str,
    device_str: str = "cpu",
    scale: int = 2,
    progress_callback=None,
) -> float:
    """
    Official CodeFormer restoration pipeline:
    1. Detect faces in input image
    2. CodeFormer restores each face
    3. Real-ESRGAN x2 upsamples background
    4. Paste restored faces onto upsampled background
    """
    _setup_codeformer_paths()
    from torchvision.transforms.functional import normalize
    from basicsr.utils import img2tensor, tensor2img
    from facelib.utils.face_restoration_helper import FaceRestoreHelper

    start = time.time()
    device = get_device(device_str)
    _force_facelib_device(device)
    upscale_factor = 2  # Background upscale factor
    fidelity_weight = 0.5  # CodeFormer fidelity (0=quality, 1=fidelity)

    logger.info(f"CodeFormer restoration on {device}")

    if progress_callback:
        progress_callback(5)

    # 1. Read image
    img = cv2.imread(input_path, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(f"Could not load image: {input_path}")
    h, w_img = img.shape[:2]
    logger.info(f"Input: {w_img}x{h}")

    # Dev taramalari kucult: CodeFormer yuzu 512px'te restore eder; 15MP bir
    # taramada yuz ~1500px oldugundan restore edilen 512'lik sonuc geri
    # yapistirilirken gerilip gorunmez olur. Uzun kenari sinirlamak yuzu
    # ~512 olcegine getirir ve iyilestirme birebir gorunur kalir.
    max_dim = int(os.environ.get("RESTORE_MAX_DIM", "1600"))
    if max(h, w_img) > max_dim:
        scale_f = max_dim / max(h, w_img)
        img = cv2.resize(img, (int(w_img * scale_f), int(h * scale_f)),
                         interpolation=cv2.INTER_AREA)
        h, w_img = img.shape[:2]
        logger.info(f"Buyuk girdi kucultuldu -> {w_img}x{h} (RESTORE_MAX_DIM={max_dim})")

    if progress_callback:
        progress_callback(10)

    # 2. Load CodeFormer. Patch torch.load only for model loading and always restore it.
    _original_torch_load = torch.load

    def _safe_torch_load(f, map_location=None, pickle_module=None, **kwargs):
        kwargs['weights_only'] = False
        if pickle_module is not None:
            return _original_torch_load(f, map_location='cpu', pickle_module=pickle_module, **kwargs)
        return _original_torch_load(f, map_location='cpu', **kwargs)

    torch.load = _safe_torch_load
    try:
        net = _load_codeformer_net(device)
    finally:
        torch.load = _original_torch_load

    if progress_callback:
        progress_callback(20)

    # 3. Setup FaceRestoreHelper
    face_helper = FaceRestoreHelper(
        upscale_factor=upscale_factor,
        face_size=512,
        crop_ratio=(1, 1),
        det_model='retinaface_resnet50',
        save_ext='png',
        use_parse=True,
        device=device,
    )

    face_helper.clean_all()
    face_helper.read_image(img)
    num_faces = face_helper.get_face_landmarks_5(
        only_center_face=False, resize=640, eye_dist_threshold=5,
    )
    face_helper.align_warp_face()
    logger.info(f"Detected {num_faces} face(s)")

    if progress_callback:
        progress_callback(35)

    # 4. Restore each face with CodeFormer
    for idx, cropped_face in enumerate(face_helper.cropped_faces):
        cropped_face_t = img2tensor(cropped_face / 255., bgr2rgb=True, float32=True)
        normalize(cropped_face_t, (0.5, 0.5, 0.5), (0.5, 0.5, 0.5), inplace=True)
        cropped_face_t = cropped_face_t.unsqueeze(0).to(device)

        try:
            with torch.no_grad():
                output = net(cropped_face_t, w=fidelity_weight, adain=True)[0]
                restored_face = tensor2img(output, rgb2bgr=True, min_max=(-1, 1))
            del output
            if device.type == "cuda":
                torch.cuda.empty_cache()
        except Exception as error:
            logger.error(f"CodeFormer failed on face {idx}: {error}")
            restored_face = tensor2img(cropped_face_t, rgb2bgr=True, min_max=(-1, 1))

        restored_face = restored_face.astype('uint8')
        face_helper.add_restored_face(restored_face, cropped_face)

    if progress_callback:
        progress_callback(70)

    # 5. Background upsampling with Real-ESRGAN x2 (falls back to Lanczos)
    bg_img = upscale_realesrgan(img, device, scale=upscale_factor)
    logger.info(f"Background upsampled: {bg_img.shape[1]}x{bg_img.shape[0]}")

    if progress_callback:
        progress_callback(85)

    # 6. Paste restored faces back
    face_helper.get_inverse_affine(None)
    result = face_helper.paste_faces_to_input_image(upsample_img=bg_img)

    if progress_callback:
        progress_callback(90)

    # Save
    cv2.imwrite(output_path, result)
    elapsed = time.time() - start
    rh, rw = result.shape[:2]
    logger.info(f"Done in {elapsed:.1f}s — {w_img}x{h} -> {rw}x{rh}, {num_faces} face(s) restored")

    if progress_callback:
        progress_callback(95)

    return elapsed
