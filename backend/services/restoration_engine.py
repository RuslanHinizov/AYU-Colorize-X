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


def _load_bg_upsampler(device: torch.device):
    """Load Real-ESRGAN as background upsampler (used by CodeFormer pipeline)."""
    if "bg_upsampler" in _cached_models:
        return _cached_models["bg_upsampler"]

    _setup_codeformer_paths()
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from basicsr.utils.realesrgan_utils import RealESRGANer

    model_path = MODELS_DIR / "RealESRGAN_x2plus.pth"
    if not model_path.exists():
        model_path = CODEFORMER_WEIGHTS_DIR / "realesrgan" / "RealESRGAN_x2plus.pth"
    if not model_path.exists():
        logger.warning("RealESRGAN_x2plus.pth not found, no bg upsampling")
        return None

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
    use_half = device.type == "cuda"
    upsampler = RealESRGANer(
        scale=2,
        model_path=str(model_path),
        model=model,
        tile=400,
        tile_pad=40,
        pre_pad=0,
        half=use_half,
    )
    _cached_models["bg_upsampler"] = upsampler
    logger.info(f"BG upsampler (Real-ESRGAN x2) loaded from {model_path}")
    return upsampler


def _load_codeformer_net(device: torch.device):
    """Load official CodeFormer network."""
    if "codeformer_net" in _cached_models:
        return _cached_models["codeformer_net"]

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
    _cached_models["codeformer_net"] = net
    logger.info(f"CodeFormer loaded from {weight_path}")
    return net


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

    # Patch torch.load: always load to CPU first to avoid CUDA serialization issues
    _original_torch_load = torch.load
    def _safe_torch_load(f, map_location=None, pickle_module=None, **kwargs):
        kwargs['weights_only'] = False
        if pickle_module is not None:
            return _original_torch_load(f, map_location='cpu', pickle_module=pickle_module, **kwargs)
        return _original_torch_load(f, map_location='cpu', **kwargs)
    torch.load = _safe_torch_load

    start = time.time()
    device = get_device(device_str)
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

    if progress_callback:
        progress_callback(10)

    # 2. Load CodeFormer
    net = _load_codeformer_net(device)

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

    # 5. Background upsampling with Real-ESRGAN x2
    bg_upsampler = _load_bg_upsampler(device)
    if bg_upsampler is not None:
        bg_img, _ = bg_upsampler.enhance(img, outscale=upscale_factor)
        logger.info(f"Background upsampled: {bg_img.shape[1]}x{bg_img.shape[0]}")
    else:
        bg_img = None

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

    torch.load = _original_torch_load
    return elapsed
