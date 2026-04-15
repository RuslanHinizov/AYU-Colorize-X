import os
import shutil
from pathlib import Path
from fastapi import UploadFile
import uuid

UPLOAD_DIR = Path("media/uploads")
OUTPUT_DIR = Path("media/outputs")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

async def save_upload_file(upload_file: UploadFile) -> str:
    """Save uploaded file and return the path"""
    # Validate file extension
    file_ext = Path(upload_file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {file_ext} not allowed. Allowed types: {ALLOWED_EXTENSIONS}")

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
    output_filename = f"{input_file.stem}_{safe_job_type}{input_file.suffix}"
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
