"""
AI Engine - Image and Video Processing
DDColor (image) + DeOldify (video) ile optimize edilmiş versiyon.
"""
import time
import shutil
import os
import logging
import tempfile
from contextlib import nullcontext
from pathlib import Path
import torch
import cv2
import warnings

# Module-level basicConfig is intentionally omitted: log configuration is the
# responsibility of the application entry-point (main.py / uvicorn), not libraries.
logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning, message=".*?Your .*? set is empty.*?")

# Import model cache
from services.model_cache import model_cache


def apply_watermark(image_path: str, logo_path: str = None):
    """Apply logo watermark and ACX text to image for Free plan."""
    if logo_path is None:
        # Use relative path from project root
        logo_path = Path(__file__).parent.parent.parent / "frontend/public/LogoAndProFoto/ayu_logo.png"
        if not logo_path.exists():
            logo_path = Path("frontend/public/LogoAndProFoto/ayu_logo.png")

    try:
        from PIL import Image, ImageDraw, ImageFont

        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            overlay = Image.new("RGBA", img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)

            # Try to load logo
            try:
                logo = Image.open(logo_path).convert("RGBA")
                logo_height = int(img.height * 0.1)
                logo_ratio = logo.width / logo.height
                logo_width = int(logo_height * logo_ratio)
                logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

                margin = 20
                logo_x = img.width - logo_width - margin
                logo_y = img.height - logo_height - margin
                overlay.paste(logo, (logo_x, logo_y), logo)
            except Exception as e:
                logger.warning(f"Could not load logo: {e}")
                logo_x = img.width - 100
                logo_y = img.height - 50
                logo_width = 0

            # Add text watermark
            font_size = int(img.height * 0.05)
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

            text = "ACX"
            text_bbox = draw.textbbox((0, 0), text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]

            margin = 20
            text_x = logo_x + logo_width + 10 if logo_width > 0 else img.width - text_width - margin
            if text_x + text_width + margin > img.width:
                text_x = logo_x - text_width - 10
            text_y = logo_y + (int(img.height * 0.1) - text_height) // 2 if logo_width > 0 else img.height - text_height - margin

            shadow_color = (0, 0, 0, 128)
            text_color = (255, 255, 255, 128)
            draw.text((text_x + 2, text_y + 2), text, font=font, fill=shadow_color)
            draw.text((text_x, text_y), text, font=font, fill=text_color)

            watermarked = Image.alpha_composite(img, overlay)
            watermarked.convert("RGB").save(image_path)

    except Exception as e:
        logger.error(f"Failed to apply watermark: {e}")


def resize_image_if_needed(image_path: str, max_dimension: int = 1280):
    """Resize image if it exceeds max dimension"""
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            width, height = img.size

            if width > max_dimension or height > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int(height * (max_dimension / width))
                else:
                    new_height = max_dimension
                    new_width = int(width * (max_dimension / height))

                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                img.save(image_path)
                logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")

    except Exception as e:
        logger.error(f"Failed to resize image: {e}")


def apply_color_preset(image_path: str, preset: str) -> None:
    """
    Apply a color grading preset to an already-saved image file.

    Supported presets:
      warm    — boost reds/yellows, reduce blues (nostalgic warm tone)
      cold    — boost blues, reduce reds (cinematic cool tone)
      vintage — desaturate + sepia tint (aged film look)
      vivid   — boost saturation (pop-art vivid look)
      none    — no change
    """
    if not preset or preset.strip().lower() in ("none", ""):
        return

    try:
        from PIL import Image, ImageEnhance
        import numpy as np

        preset = preset.strip().lower()

        with Image.open(image_path) as img:
            img = img.convert("RGB")
            arr = np.array(img, dtype=np.float32)

            if preset == "warm":
                # Boost R, reduce B
                arr[:, :, 0] = np.clip(arr[:, :, 0] + 22, 0, 255)   # R +22
                arr[:, :, 2] = np.clip(arr[:, :, 2] - 22, 0, 255)   # B -22

            elif preset == "cold":
                # Boost B, reduce R slightly
                arr[:, :, 0] = np.clip(arr[:, :, 0] - 15, 0, 255)   # R -15
                arr[:, :, 2] = np.clip(arr[:, :, 2] + 28, 0, 255)   # B +28

            elif preset == "vintage":
                # Desaturate 70% then add sepia tint
                result_img = Image.fromarray(arr.astype(np.uint8))
                gray = result_img.convert("L")
                result_img = result_img.convert("RGB")
                # Blend original with grayscale (desaturate to 70%)
                result_img = Image.blend(
                    result_img,
                    gray.convert("RGB"),
                    alpha=0.30
                )
                arr = np.array(result_img, dtype=np.float32)
                # Sepia tint: shift R up, B down
                arr[:, :, 0] = np.clip(arr[:, :, 0] + 15, 0, 255)   # R +15 (warmth)
                arr[:, :, 2] = np.clip(arr[:, :, 2] - 20, 0, 255)   # B -20 (age)

            elif preset == "vivid":
                # Increase saturation by 30%
                result_img = Image.fromarray(arr.astype(np.uint8))
                enhancer = ImageEnhance.Color(result_img)
                result_img = enhancer.enhance(1.35)
                result_img.save(image_path, quality=95)
                logger.info(f"Color preset '{preset}' applied to {image_path}")
                return  # Early return — already saved

            else:
                logger.warning(f"Unknown color preset '{preset}', skipping")
                return

            result_img = Image.fromarray(arr.astype(np.uint8))
            result_img.save(image_path, quality=95)
            logger.info(f"Color preset '{preset}' applied to {image_path}")

    except Exception as e:
        logger.warning(f"Failed to apply color preset '{preset}': {e}")


def colorize_image(
    input_path: str,
    output_path: str,
    render_factor: int = 35,
    model_name: str = "artistic",
    device: str = "cpu",
    watermark: bool = False,
    resize: bool = False,
    progress_callback=None,
    color_preset: str = "none",
) -> float:
    """
    Colorize a black and white image using DDColor with cached model.
    model_name: 'artistic' or 'modelscope'
    color_preset: 'none' | 'warm' | 'cold' | 'vintage' | 'vivid'
    """
    start_time = time.time()

    try:
        # Resize if needed (Free plan limitation)
        if resize:
            resize_image_if_needed(input_path, max_dimension=1280)

        if progress_callback:
            progress_callback(10)

        # Get cached DDColor pipeline
        pipeline = model_cache.get_ddcolor(model_name, device)
        logger.info(f"Processing image with DDColor ({model_name}) on device: {device}")

        if progress_callback:
            progress_callback(30)

        if pipeline:
            # Read image with OpenCV (BGR format)
            img = cv2.imread(input_path)
            if img is None:
                raise ValueError(f"Could not load image: {input_path}")

            if progress_callback:
                progress_callback(50)

            # Colorize using DDColor pipeline
            result = pipeline.process(img)

            if progress_callback:
                progress_callback(75)

            # Save result
            cv2.imwrite(output_path, result)
        else:
            raise RuntimeError("DDColor model not available. Please check model installation.")

        # Apply color preset (post-processing tone grading)
        if color_preset and color_preset.lower() != "none":
            apply_color_preset(output_path, color_preset)

        # Apply Watermark if needed (Free plan limitation)
        if watermark:
            apply_watermark(output_path)

        if progress_callback:
            progress_callback(95)

    except Exception as e:
        logger.exception(f"Colorization failed: {e}")
        raise

    processing_time = time.time() - start_time
    return processing_time


def colorize_video(
    input_path: str,
    output_path: str,
    render_factor: int = 30,
    device: str = "cpu",
    progress_callback=None
) -> float:
    """
    Colorize a black and white video using DeOldify with cached model.
    (DDColor doesn't support video natively, so we keep DeOldify for video)
    """
    start_time = time.time()

    try:
        # Prefer system ffmpeg/ffprobe in Docker/local PATH. If unavailable,
        # fall back to imageio_ffmpeg for ffmpeg-python calls. DeOldify still
        # shells out to "ffmpeg", so Docker installs ffmpeg explicitly.
        try:
            import shutil as _shutil
            import ffmpeg._run as _ffmpeg_run
            _ffmpeg_exe = _shutil.which("ffmpeg")
            if not _ffmpeg_exe:
                import imageio_ffmpeg
                _ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            if not _ffmpeg_exe:
                raise RuntimeError("ffmpeg executable not found")

            # Add ffmpeg binary's directory to PATH so DeOldify's os.system('ffmpeg ...')
            # calls find it. Also add backend dir so ffmpeg.bat wrapper is found on Windows.
            _ffmpeg_dir = str(Path(_ffmpeg_exe).parent)
            _backend_dir = str(Path(__file__).parent.parent)
            for _d in (_ffmpeg_dir, _backend_dir):
                if _d not in os.environ.get("PATH", ""):
                    os.environ["PATH"] = _d + os.pathsep + os.environ.get("PATH", "")

            # Patch ffmpeg-python library's compile so it uses the same exe
            _orig_compile = _ffmpeg_run.compile
            def _patched_compile(stream_spec, cmd='ffmpeg', overwrite_output=False):
                if cmd == 'ffmpeg':
                    cmd = _ffmpeg_exe
                return _orig_compile(stream_spec, cmd=cmd, overwrite_output=overwrite_output)
            _ffmpeg_run.compile = _patched_compile
            # Patch ffmpeg.probe to use OpenCV (no ffprobe binary available)
            import ffmpeg._probe as _ffmpeg_probe
            def _cv2_probe(filename, cmd='ffprobe', **kwargs):
                cap = cv2.VideoCapture(str(filename))
                fps_num = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                duration = frame_count / fps_num if fps_num > 0 else 0
                cap.release()
                from fractions import Fraction
                fps_frac = str(Fraction(fps_num).limit_denominator(1000))
                return {
                    'streams': [{'codec_type': 'video', 'avg_frame_rate': fps_frac,
                                 'width': width, 'height': height,
                                 'nb_frames': str(frame_count)}],
                    'format': {'duration': str(duration), 'filename': str(filename)}
                }
            _ffmpeg_probe.probe = _cv2_probe
            import ffmpeg as _ffmpeg_mod
            _ffmpeg_mod.probe = _cv2_probe
            logger.info(f"ffmpeg ready: {_ffmpeg_exe}, probe patched with OpenCV")
        except Exception as _ffe:
            logger.warning(f"Could not configure ffmpeg: {_ffe}")

        # Apply FastAI patches for DeOldify video
        try:
            import fastai.callback
            import fastai.basic_train

            _original_on_batch_begin = fastai.callback.CallbackHandler.on_batch_begin

            def _safe_on_batch_begin(self, xb, yb, train=False, **kwargs):
                return _original_on_batch_begin(self, xb, yb, **kwargs)

            fastai.callback.CallbackHandler.on_batch_begin = _safe_on_batch_begin

            if hasattr(fastai.basic_train, 'CallbackHandler'):
                fastai.basic_train.CallbackHandler.on_batch_begin = _safe_on_batch_begin
        except Exception:
            pass

        # Get cached video colorizer
        video_colorizer = model_cache.get_video_colorizer(device)
        logger.info(f"Processing video on device: {device} (cached model)")
        if video_colorizer is None:
            logger.warning("DeOldify video colorizer unavailable; using original-video fallback output")
            shutil.copy(input_path, output_path)
            if progress_callback:
                progress_callback(95)
            return time.time() - start_time

        # Setup source directory
        source_dir = Path("video/source")
        source_dir.mkdir(parents=True, exist_ok=True)

        input_filename = Path(input_path).name
        temp_input_path = source_dir / input_filename
        shutil.copy(input_path, temp_input_path)

        if progress_callback:
            progress_callback(10)

        # Progress monitor thread
        import threading
        stop_monitor = threading.Event()

        def monitor_progress():
            try:
                work_folder = Path('./video')
                filename_stem = Path(input_filename).stem
                bw_folder = work_folder / 'bwframes' / filename_stem
                color_folder = work_folder / 'colorframes' / filename_stem

                total_frames = 0

                while not stop_monitor.is_set():
                    if bw_folder.exists():
                        current_frames = len(list(bw_folder.glob('*.jpg')))
                        if current_frames > total_frames:
                            total_frames = current_frames

                    if color_folder.exists() and total_frames > 0:
                        processed_frames = len(list(color_folder.glob('*.jpg')))
                        if processed_frames > 0:
                            percent = 30 + int((processed_frames / total_frames) * 60)
                            if progress_callback:
                                progress_callback(min(percent, 90))

                    time.sleep(1)
            except Exception as e:
                logger.error(f"Progress monitor error: {e}")

        monitor_thread = threading.Thread(target=monitor_progress)
        monitor_thread.start()

        try:
            result_video_path = video_colorizer.colorize_from_file_name(
                file_name=input_filename,
                render_factor=render_factor
            )
        finally:
            stop_monitor.set()
            monitor_thread.join()

        if progress_callback:
            progress_callback(95)

        if result_video_path and Path(result_video_path).exists():
            shutil.move(str(result_video_path), output_path)
        else:
            raise Exception("Video colorization failed to produce output")

    except Exception as e:
        logger.exception(f"Video colorization failed; using original-video fallback output: {e}")
        shutil.copy(input_path, output_path)
        if progress_callback:
            progress_callback(95)

    processing_time = time.time() - start_time
    return processing_time


def _upscale_with_realesrgan_or_resize(
    input_path: str,
    output_path: str,
    scale: int = 4,
    device: str = "cpu",
    progress_callback=None
) -> float:
    """
    Upscale using Real-ESRGAN.
    Supported scales:
      4x  — single Real-ESRGAN 4x pass (true 4x)
      8x  — single Real-ESRGAN 4x pass → PIL resize to exactly 8x of original (true 8x)
      16x — two chained Real-ESRGAN 4x passes (true 16x)
    Input is capped at 512x512 for 16x to avoid memory exhaustion.
    """
    start_time = time.time()

    # For 16x: cap input resolution to avoid OOM
    if scale == 16:
        try:
            from PIL import Image
            with Image.open(input_path) as img:
                w, h = img.size
                if w > 512 or h > 512:
                    ratio = min(512 / w, 512 / h)
                    new_w = int(w * ratio)
                    new_h = int(h * ratio)
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    img.save(input_path)
                    logger.info(f"16x upscale: capped input from {w}x{h} to {new_w}x{new_h}")
        except Exception as e:
            logger.warning(f"Failed to cap input for 16x: {e}")

    try:
        from services.restoration_engine import upscale_realesrgan, get_device

        if progress_callback:
            progress_callback(10)

        logger.info(f"Starting upscale {scale}x on device: {device}")
        torch_device = get_device(device)

        if scale == 16:
            # True 16x: chain two Real-ESRGAN 4x passes (4x → 4x = 16x)
            image = cv2.imread(input_path)
            if image is None:
                raise ValueError(f"Could not load image: {input_path}")
            orig_w, orig_h = image.shape[1], image.shape[0]

            if progress_callback:
                progress_callback(20)

            # First 4x pass
            result_4x = upscale_realesrgan(image, torch_device, scale=4)

            if progress_callback:
                progress_callback(55)

            # Second 4x pass → 16x total
            result_16x = upscale_realesrgan(result_4x, torch_device, scale=4)

            if progress_callback:
                progress_callback(85)

            cv2.imwrite(output_path, result_16x)
            logger.info(
                f"16x upscale: {orig_w}x{orig_h} → "
                f"{result_4x.shape[1]}x{result_4x.shape[0]} → "
                f"{result_16x.shape[1]}x{result_16x.shape[0]}"
            )

        elif scale == 8:
            # True 8x: 4x Real-ESRGAN pass, then PIL resize to exactly 8x of original
            from PIL import Image as PILImage

            with PILImage.open(input_path) as pil_img:
                orig_w, orig_h = pil_img.size

            image = cv2.imread(input_path)
            if image is None:
                raise ValueError(f"Could not load image: {input_path}")

            if progress_callback:
                progress_callback(25)

            # Single 4x Real-ESRGAN pass (high quality upscale)
            result_4x = upscale_realesrgan(image, torch_device, scale=4)

            if progress_callback:
                progress_callback(70)

            # Resize from 4x output to exactly 8x of original using LANCZOS
            target_w, target_h = orig_w * 8, orig_h * 8
            result_4x_rgb = cv2.cvtColor(result_4x, cv2.COLOR_BGR2RGB)
            pil_4x = PILImage.fromarray(result_4x_rgb)
            pil_8x = pil_4x.resize((target_w, target_h), PILImage.Resampling.LANCZOS)
            result_8x_rgb = cv2.cvtColor(
                cv2.resize(cv2.cvtColor(
                    cv2.cvtColor(result_4x, cv2.COLOR_BGR2RGB), cv2.COLOR_RGB2BGR
                ), (target_w, target_h), interpolation=cv2.INTER_LANCZOS4),
                cv2.COLOR_BGR2BGR
            )
            # Use PIL save for better quality
            pil_8x.save(output_path, quality=95)

            if progress_callback:
                progress_callback(90)

            logger.info(
                f"8x upscale: {orig_w}x{orig_h} → (4x ESRGAN) → "
                f"{result_4x.shape[1]}x{result_4x.shape[0]} → (resize) → "
                f"{target_w}x{target_h}"
            )

        else:
            # 4x (or any other) — single Real-ESRGAN pass
            image = cv2.imread(input_path)
            if image is None:
                raise ValueError(f"Could not load image: {input_path}")

            if progress_callback:
                progress_callback(30)

            result = upscale_realesrgan(image, torch_device, scale=scale)

            if progress_callback:
                progress_callback(80)

            cv2.imwrite(output_path, result)
            logger.info(f"Upscaled {scale}x: {image.shape[1]}x{image.shape[0]} → {result.shape[1]}x{result.shape[0]}")

        if progress_callback:
            progress_callback(95)

    except Exception as exc:
        logger.exception("Real-ESRGAN upscale failed; using fallback resize: %s", exc)
        # Fallback to simple PIL resize
        try:
            from PIL import Image
            with Image.open(input_path) as img:
                new_size = (img.width * scale, img.height * scale)
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                img.save(output_path)
        except Exception:
            shutil.copy(input_path, output_path)
        if progress_callback:
            progress_callback(95)

    return time.time() - start_time


def upscale_image(
    input_path: str,
    output_path: str,
    scale: int = 2,
    device: str = "cpu",
    enhance_mode: str = "upscale",
    progress_callback=None
) -> float:
    """
    Upscale image using the configured provider.

    Provider order is explicit. A configured Gemini key no longer hijacks local
    enhancement: set UPSCALE_PROVIDER=gemini when API-based processing is
    desired.
    """
    from config import settings

    provider = (settings.UPSCALE_PROVIDER or "pisasr").strip().lower()

    if provider == "gemini":
        from services.gemini_image_engine import gemini_configured, enhance_image_with_gemini

        if not gemini_configured():
            raise RuntimeError("UPSCALE_PROVIDER=gemini but GEMINI_API_KEY is not configured")
        return enhance_image_with_gemini(
            input_path=input_path,
            output_path=output_path,
            mode=enhance_mode,
            fallback_mode="upscale",
            progress_callback=progress_callback,
        )

    if provider == "pisasr":
        try:
            from services.local_enhance_engine import upscale_with_pisasr

            return upscale_with_pisasr(
                input_path=input_path,
                output_path=output_path,
                progress_callback=progress_callback,
            )
        except Exception as exc:
            if not settings.LOCAL_ENHANCE_ALLOW_FALLBACK:
                raise
            logger.warning("PiSA-SR unavailable/failed; falling back to Real-ESRGAN: %s", exc)

    return _upscale_with_realesrgan_or_resize(
        input_path=input_path,
        output_path=output_path,
        scale=scale,
        device=device,
        progress_callback=progress_callback,
    )


def restore_image(
    input_path: str,
    output_path: str,
    device: str = "cpu",
    scale: int = 2,
    enhance_mode: str = "restore",
    progress_callback=None,
) -> float:
    """
    Restore image using VQFR/CodeFormer/Gemini based on configuration.
    """
    from config import settings

    start_time = time.time()
    provider = (settings.FACE_RESTORE_PROVIDER or "vqfr").strip().lower()
    mode = (enhance_mode or "restore").strip().lower().replace("-", "_")
    wants_upscale = mode in {"restore_upscale", "restore_and_upscale", "both", "auto"}

    def scaled_progress(base: int, span: int):
        if not progress_callback:
            return None

        def _callback(value: int) -> None:
            progress_callback(base + int((max(0, min(100, value)) / 100) * span))

        return _callback

    if provider == "gemini":
        from services.gemini_image_engine import gemini_configured, enhance_image_with_gemini

        if not gemini_configured():
            raise RuntimeError("FACE_RESTORE_PROVIDER=gemini but GEMINI_API_KEY is not configured")
        return enhance_image_with_gemini(
            input_path=input_path,
            output_path=output_path,
            mode=enhance_mode,
            fallback_mode="restore",
            progress_callback=progress_callback,
        )

    with (tempfile.TemporaryDirectory(prefix="restore_enhance_") if wants_upscale else nullcontext("")) as temp_name:
        restore_output = output_path
        if wants_upscale:
            restore_output = str(Path(temp_name) / "restored.jpg")

        if provider == "vqfr":
            try:
                from services.local_enhance_engine import restore_with_vqfr

                restore_with_vqfr(
                    input_path=input_path,
                    output_path=restore_output,
                    progress_callback=scaled_progress(0, 70) if wants_upscale else progress_callback,
                )
            except Exception as exc:
                if not settings.LOCAL_ENHANCE_ALLOW_FALLBACK:
                    raise
                logger.warning("VQFR unavailable/failed; falling back to CodeFormer: %s", exc)
                from services.restoration_engine import restore_photo

                restore_photo(
                    input_path,
                    restore_output,
                    device,
                    scale,
                    progress_callback=scaled_progress(0, 70) if wants_upscale else progress_callback,
                )
        else:
            from services.restoration_engine import restore_photo

            restore_photo(
                input_path,
                restore_output,
                device,
                scale,
                progress_callback=scaled_progress(0, 70) if wants_upscale else progress_callback,
            )

        if wants_upscale:
            upscale_image(
                restore_output,
                output_path,
                scale=scale,
                device=device,
                enhance_mode="upscale",
                progress_callback=scaled_progress(70, 25),
            )
        elif progress_callback:
            progress_callback(95)

    return time.time() - start_time
