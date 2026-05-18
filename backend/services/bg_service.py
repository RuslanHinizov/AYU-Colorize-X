"""
Background Removal Service
Uses rembg (U2Net model) to remove backgrounds from images.
Supports: transparent PNG output, solid color replacement, white/black background.
"""
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)


def remove_background(
    input_path: str,
    output_path: str,
    bg_type: str = "transparent",
    bg_color: str = None,
    progress_callback=None,
) -> None:
    """
    Remove the background from an image.

    Args:
        input_path:       Path to the source image (JPG, PNG, WEBP, etc.)
        output_path:      Destination path. Always written as PNG to preserve transparency.
        bg_type:          'transparent' | 'white' | 'black' | 'color'
        bg_color:         Hex color string (e.g. '#ff5733') used when bg_type='color'.
        progress_callback: Optional callable(int 0-100).
    """
    import time
    start = time.time()

    if progress_callback:
        progress_callback(5)

    try:
        from rembg import remove as rembg_remove
        from PIL import Image
        import io

        if progress_callback:
            progress_callback(20)

        # --- Run rembg ---
        with open(input_path, "rb") as f:
            raw_bytes = f.read()

        if progress_callback:
            progress_callback(35)

        result_bytes = rembg_remove(raw_bytes)

        if progress_callback:
            progress_callback(70)

        # Parse RGBA result
        rgba_img = Image.open(io.BytesIO(result_bytes)).convert("RGBA")

        bg_type_lower = (bg_type or "transparent").strip().lower()

        if bg_type_lower == "transparent":
            # Keep as-is, save as PNG
            out_path = _ensure_png_extension(output_path)
            rgba_img.save(out_path, format="PNG")

        else:
            # Composite over a solid color background
            bg_color_tuple = _parse_color(bg_type_lower, bg_color)
            background = Image.new("RGBA", rgba_img.size, bg_color_tuple)
            composed = Image.alpha_composite(background, rgba_img)
            # Save as PNG (lossless) even when background is opaque
            out_path = _ensure_png_extension(output_path)
            composed.convert("RGB").save(out_path, format="PNG")

        # If the caller expected a different extension, copy the PNG there too
        if out_path != output_path:
            shutil.copy(out_path, output_path)

        if progress_callback:
            progress_callback(95)

        elapsed = time.time() - start
        logger.info(
            f"Background removal completed in {elapsed:.2f}s "
            f"(type={bg_type_lower}, input={input_path})"
        )
        return elapsed

    except ImportError:
        logger.error(
            "rembg is not installed. Run: pip install rembg  "
            "Falling back to copying original image."
        )
        shutil.copy(input_path, output_path)
        if progress_callback:
            progress_callback(95)
        return time.time() - start

    except Exception as exc:
        logger.exception(f"Background removal failed: {exc}")
        shutil.copy(input_path, output_path)
        if progress_callback:
            progress_callback(95)
        return time.time() - start


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_png_extension(path: str) -> str:
    """Return the path with .png extension (replace original ext if needed)."""
    p = Path(path)
    if p.suffix.lower() != ".png":
        return str(p.with_suffix(".png"))
    return path


def _parse_color(bg_type: str, hex_color: str | None) -> tuple:
    """Return an RGBA tuple for the requested background type."""
    if bg_type == "white":
        return (255, 255, 255, 255)
    if bg_type == "black":
        return (0, 0, 0, 255)
    if bg_type == "color" and hex_color:
        return _hex_to_rgba(hex_color)
    # Fallback
    return (255, 255, 255, 255)


def _hex_to_rgba(hex_str: str) -> tuple:
    """Convert '#rrggbb' or 'rrggbb' to (R, G, B, 255)."""
    h = hex_str.lstrip("#")
    if len(h) == 6:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        return (r, g, b, 255)
    return (255, 255, 255, 255)
