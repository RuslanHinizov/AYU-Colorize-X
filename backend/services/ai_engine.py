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


def colorize_image(
    input_path: str,
    output_path: str,
    render_factor: int = 35,
    model_name: str = "artistic",
    device: str = "cpu",
    watermark: bool = False,
    resize: bool = False,
    progress_callback=None
) -> float:
    """
    Colorize a black and white image using DDColor with cached model.
    model_name: 'artistic' or 'modelscope'
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
                progress_callback(80)

            # Save result
            cv2.imwrite(output_path, result)
        else:
            raise RuntimeError("DDColor model not available. Please check model installation.")

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
            # Patch ffmpeg-python
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
    scale: int = 2,
    device: str = "cpu",
    progress_callback=None
) -> float:
    start_time = time.time()

    try:
        from services.restoration_engine import upscale_realesrgan, get_device

        if progress_callback:
            progress_callback(10)

        logger.info(f"Starting upscale {scale}x on device: {device}")

        torch_device = get_device(device)
        image = cv2.imread(input_path)

        if image is None:
            raise ValueError(f"Could not load image: {input_path}")

        if progress_callback:
            progress_callback(30)

        result = upscale_realesrgan(image, torch_device, scale=scale)

        if progress_callback:
            progress_callback(80)

        cv2.imwrite(output_path, result)
        logger.info(f"Upscaled from {image.shape[1]}x{image.shape[0]} to {result.shape[1]}x{result.shape[0]}")

        if progress_callback:
            progress_callback(95)

    except Exception as exc:
        logger.exception("Real-ESRGAN upscale failed; using fallback resize: %s", exc)
        # Fallback to simple resize
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
