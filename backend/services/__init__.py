# Services package
from services.auth_service import (
    verify_password,
    get_password_hash,
    is_student_email,
    create_access_token,
    decode_access_token
)
from services.storage import save_upload_file, get_output_path, delete_file

# Lazy imports for heavy AI modules - only loaded when accessed
def __getattr__(name):
    if name in ("colorize_image", "colorize_video", "restore_image", "upscale_image"):
        from services.ai_engine import colorize_image, colorize_video, restore_image, upscale_image
        globals().update({
            "colorize_image": colorize_image,
            "colorize_video": colorize_video,
            "restore_image": restore_image,
            "upscale_image": upscale_image,
        })
        return globals()[name]
    if name == "model_cache":
        from services.model_cache import model_cache
        globals()["model_cache"] = model_cache
        return model_cache
    raise AttributeError(f"module 'services' has no attribute {name!r}")

__all__ = [
    "verify_password",
    "get_password_hash",
    "is_student_email",
    "create_access_token",
    "decode_access_token",
    "save_upload_file",
    "get_output_path",
    "delete_file",
    "colorize_image",
    "colorize_video",
    "restore_image",
    "upscale_image",
    "model_cache"
]
