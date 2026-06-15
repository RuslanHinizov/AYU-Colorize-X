import os
import shutil
from pathlib import Path
from fastapi import UploadFile
import uuid
import cv2
from PIL import Image, UnidentifiedImageError

UPLOAD_DIR = Path("media/uploads")
OUTPUT_DIR = Path("media/outputs")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024  # 10GB — effectively no limit


def _is_image(file_ext: str) -> bool:
    return file_ext in IMAGE_EXTENSIONS


def _is_video(file_ext: str) -> bool:
    return file_ext in VIDEO_EXTENSIONS


def _validate_content_type(upload_file: UploadFile, file_ext: str) -> None:
    content_type = (upload_file.content_type or "").lower()
    if _is_image(file_ext) and content_type and not content_type.startswith("image/"):
        raise ValueError("Uploaded file content type does not match an image")
    if _is_video(file_ext) and content_type and not content_type.startswith("video/"):
        # Some browsers use application/octet-stream for videos; allow that.
        if content_type != "application/octet-stream":
            raise ValueError("Uploaded file content type does not match a video")


def _validate_image_file(file_path: Path) -> None:
    try:
        Image.MAX_IMAGE_PIXELS = None  # disable DecompressionBomb check — no limits
        with Image.open(file_path) as img:
            img.verify()
        with Image.open(file_path) as img:
            width, height = img.size
            if width <= 0 or height <= 0:
                raise ValueError("Invalid image dimensions")
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Invalid or corrupted image file") from exc


def _validate_video_file(file_path: Path) -> None:
    cap = cv2.VideoCapture(str(file_path))
    try:
        if not cap.isOpened():
            raise ValueError("Invalid or corrupted video file")
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        if width <= 0 or height <= 0 or frames <= 0:
            raise ValueError("Invalid video metadata")
        # No resolution / duration / FPS limits
    finally:
        cap.release()

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file and return the path"""
    # Validate file extension
    file_ext = Path(upload_file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {file_ext} not allowed. Allowed types: {ALLOWED_EXTENSIONS}")

    _validate_content_type(upload_file, file_ext)

    # Early size check via Content-Length header (if available)
    if upload_file.size and upload_file.size > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)}MB")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename

    # Save file with size check
    size = 0
    with file_path.open("wb") as buffer:
        while chunk := await upload_file.read(1024 * 1024):  # 1MB chunks
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                buffer.close()
                file_path.unlink(missing_ok=True)
                raise ValueError(f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)}MB")
            buffer.write(chunk)

    try:
        if _is_image(file_ext):
            _validate_image_file(file_path)
        elif _is_video(file_ext):
            _validate_video_file(file_path)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise

    return str(file_path)

def _validate_path_within(file_path: Path, allowed_dir: Path) -> Path:
    """Ensure resolved path is within the allowed directory (prevent path traversal)"""
    resolved = file_path.resolve()
    allowed_resolved = allowed_dir.resolve()
    if not str(resolved).startswith(str(allowed_resolved)):
        raise ValueError(f"Path traversal detected: {file_path}")
    return resolved

def get_output_path(input_path: str, job_type: str) -> str:
    """Generate output path for processed image"""
    input_file = Path(input_path)
    # Sanitize job_type to prevent path injection
    safe_job_type = "".join(c for c in job_type.lower() if c.isalnum() or c == '_')
    output_ext = ".mp4" if safe_job_type == "video_colorize" else ".jpg"
    output_filename = f"{input_file.stem}_{safe_job_type}{output_ext}"
    output_path = OUTPUT_DIR / output_filename
    _validate_path_within(output_path, OUTPUT_DIR)
    return str(output_path)

def delete_file(file_path: str):
    """Delete a file if it exists, only within allowed directories"""
    try:
        path = Path(file_path)
        resolved = path.resolve()
        uploads_resolved = UPLOAD_DIR.resolve()
        outputs_resolved = OUTPUT_DIR.resolve()
        if str(resolved).startswith(str(uploads_resolved)) or str(resolved).startswith(str(outputs_resolved)):
            path.unlink(missing_ok=True)
    except Exception:
        pass
