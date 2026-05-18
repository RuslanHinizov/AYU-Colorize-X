"""Gemini-backed image enhancement provider.

The local CodeFormer/Real-ESRGAN stack remains available as a fallback, but
when GEMINI_API_KEY is configured this module is the primary provider for
RESTORE and UPSCALE jobs.
"""
from __future__ import annotations

import io
import logging
import time
import base64
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageOps

from config import settings

logger = logging.getLogger(__name__)


class GeminiImageError(RuntimeError):
    """Raised when Gemini did not produce a usable image."""


@dataclass(frozen=True)
class EnhancePrompt:
    title: str
    text: str


PROMPTS = {
    "restore": EnhancePrompt(
        title="Photo restoration",
        text=(
            "Restore this photo while preserving the original scene, identity, "
            "pose, clothing, composition, and era. Repair scratches, stains, "
            "noise, blur, faded contrast, and damaged facial details. Keep the "
            "result natural and photographic. Do not add new people, objects, "
            "text, logos, or decorative elements."
        ),
    ),
    "upscale": EnhancePrompt(
        title="Photo upscale",
        text=(
            "Increase the apparent resolution and detail of this photo while "
            "preserving the exact subject, composition, colors, and lighting. "
            "Sharpen naturally, reduce compression artifacts and noise, and keep "
            "edges clean. Do not change identity, objects, text, layout, or style."
        ),
    ),
    "restore_upscale": EnhancePrompt(
        title="Photo restoration and upscale",
        text=(
            "Restore and upscale this photo in one pass. Preserve the original "
            "scene, identity, composition, clothing, and era. Repair scratches, "
            "stains, noise, blur, faded contrast, and facial damage, then enhance "
            "detail and resolution naturally. Do not add new people, objects, "
            "text, logos, or decorative elements."
        ),
    ),
}


def gemini_configured() -> bool:
    return bool(settings.GEMINI_API_KEY.strip())


def _format_gemini_exception(exc: Exception) -> str:
    raw = str(exc)
    lowered = raw.lower()

    if "resource_exhausted" in lowered or "quota exceeded" in lowered or "429" in raw:
        return (
            "Gemini API kotası dolu veya bu Google AI Studio projesinde image model kotası yok. "
            "Google AI Studio/Cloud tarafında billing ve quota ayarlarını açın, sonra tekrar deneyin."
        )
    if "api_key_invalid" in lowered or "invalid api key" in lowered or "403" in raw:
        return "Gemini API key geçersiz veya bu model için yetkili değil."
    if "permission" in lowered or "not authorized" in lowered:
        return "Gemini API key bu image modelini kullanmaya yetkili değil."
    if "not found" in lowered and "model" in lowered:
        return f"Gemini image modeli bulunamadı: {settings.GEMINI_IMAGE_MODEL}"

    return f"Gemini image enhancement failed: {raw}"


def _normalize_mode(mode: str | None, fallback: str) -> str:
    normalized = (mode or fallback).strip().lower().replace("-", "_")
    if normalized == "auto":
        normalized = fallback
    if normalized not in PROMPTS:
        raise ValueError(f"Unsupported Gemini enhance mode: {mode}")
    return normalized


def _response_parts(response) -> Iterable:
    direct_parts = getattr(response, "parts", None)
    if direct_parts:
        return direct_parts

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None)
        if parts:
            return parts
    return []


def _part_to_bytes(part) -> bytes | None:
    inline_data = getattr(part, "inline_data", None)
    if inline_data is not None:
        data = getattr(inline_data, "data", None)
        if isinstance(data, bytes):
            return data
        if isinstance(data, str):
            return base64.b64decode(data)

    as_image = getattr(part, "as_image", None)
    if callable(as_image):
        image = as_image()
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    return None


def _part_text(part) -> str | None:
    text = getattr(part, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()
    return None


def _load_input_image(input_path: str) -> Image.Image:
    image = Image.open(input_path)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    return image


def _save_output_image(image_bytes: bytes, output_path: str) -> None:
    with Image.open(io.BytesIO(image_bytes)) as image:
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        image.save(output_path, format="JPEG", quality=95, optimize=True)


def enhance_image_with_gemini(
    input_path: str,
    output_path: str,
    mode: str,
    fallback_mode: str = "restore",
    progress_callback=None,
) -> float:
    """Enhance an image with Gemini and save a normalized JPEG output."""
    if not gemini_configured():
        raise GeminiImageError("GEMINI_API_KEY is not configured")

    start_time = time.time()
    normalized_mode = _normalize_mode(mode, fallback=fallback_mode)
    prompt = PROMPTS[normalized_mode]

    if progress_callback:
        progress_callback(10)

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise GeminiImageError(
            "google-genai is not installed. Install backend requirements before using Gemini image mode."
        ) from exc

    image = _load_input_image(input_path)
    if progress_callback:
        progress_callback(25)

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=120_000),
    )
    try:
        last_error: Exception | None = None
        response = None
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=settings.GEMINI_IMAGE_MODEL,
                    contents=[prompt.text, image],
                    config=types.GenerateContentConfig(
                        response_modalities=["TEXT", "IMAGE"],
                    ),
                )
                break
            except Exception as exc:
                last_error = exc
                if attempt == 1:
                    raise GeminiImageError(_format_gemini_exception(exc)) from exc
                time.sleep(1.5)

        if progress_callback:
            progress_callback(75)

        text_parts: list[str] = []
        for part in _response_parts(response):
            image_bytes = _part_to_bytes(part)
            if image_bytes:
                _save_output_image(image_bytes, output_path)
                if progress_callback:
                    progress_callback(95)
                logger.info(
                    "Gemini %s completed with model %s",
                    prompt.title,
                    settings.GEMINI_IMAGE_MODEL,
                )
                return time.time() - start_time

            text = _part_text(part)
            if text:
                text_parts.append(text)

        detail = "; ".join(text_parts) if text_parts else "response contained no image parts"
        if last_error:
            detail = f"{detail}; last error: {last_error}"
        raise GeminiImageError(f"Gemini image enhancement failed: {detail}")
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
