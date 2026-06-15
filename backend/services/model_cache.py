"""
AI Model Cache Manager
Singleton pattern ile modelleri bellekte tutar, her seferinde yeniden yüklemeyi önler.
DDColor + Real-ESRGAN modelleri için optimize edilmiş.
"""
import threading
import logging
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import torch
import os
import shutil
import tempfile

logger = logging.getLogger(__name__)

def _get_models_dir() -> Path:
    """Return AI models directory — respects AI_MODELS_DIR setting/env var."""
    try:
        from config import settings
        if settings.AI_MODELS_DIR:
            return Path(settings.AI_MODELS_DIR)
    except Exception:
        pass
    env_val = os.getenv("AI_MODELS_DIR", "")
    if env_val:
        return Path(env_val)
    return Path(__file__).parent.parent / "ai_models"

# Add DDColor repo to path for model imports
_ddcolor_repo_path = str(Path(__file__).parent.parent / "ddcolor_repo")
if _ddcolor_repo_path not in sys.path:
    sys.path.insert(0, _ddcolor_repo_path)


def _prefer_ddcolor_basicsr() -> None:
    """Ensure DDColor imports its bundled basicsr instead of CodeFormer's."""
    if _ddcolor_repo_path in sys.path:
        sys.path.remove(_ddcolor_repo_path)
    sys.path.insert(0, _ddcolor_repo_path)

    basicsr_mod = sys.modules.get("basicsr")
    mod_file = getattr(basicsr_mod, "__file__", "") if basicsr_mod else ""
    if basicsr_mod is not None and _ddcolor_repo_path not in mod_file:
        stale = [name for name in sys.modules if name == "basicsr" or name.startswith("basicsr.")]
        for name in stale:
            del sys.modules[name]


class ModelCache:
    """Thread-safe singleton model cache"""
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._models: Dict[str, Any] = {}
        self._model_lock = threading.Lock()
        self._initialized = True
        logger.info("ModelCache initialized")

    def get_device(self, device_name: str) -> torch.device:
        """Get torch device based on name and availability"""
        if device_name.lower() == "gpu" and torch.cuda.is_available():
            return torch.device("cuda")
        if device_name.lower() == "gpu" and not torch.cuda.is_available():
            logger.warning("GPU requested but CUDA not available, falling back to CPU")
        return torch.device("cpu")

    def get_ddcolor(self, model_name: str = "artistic", device_name: str = "cpu"):
        """
        Get or create DDColor colorizer pipeline with caching.
        model_name: 'artistic' or 'modelscope'
        """
        cache_key = f"ddcolor_{model_name}_{device_name}"

        with self._model_lock:
            if cache_key in self._models:
                logger.info(f"Using cached DDColor: {cache_key}")
                return self._models[cache_key]

            logger.info(f"Loading DDColor: {cache_key}")

            _prefer_ddcolor_basicsr()
            from ddcolor import DDColor, ColorizationPipeline, build_ddcolor_model

            # Model paths — respects AI_MODELS_DIR from settings/.env
            models_dir = _get_models_dir()
            if model_name.lower() in ("modelscope", "stable"):
                model_path = models_dir / "ddcolor_modelscope.pth"
            else:
                model_path = models_dir / "ddcolor_artistic.pth"

            if not model_path.exists():
                # Try to download from HuggingFace
                self._download_ddcolor_model(model_name, model_path)

            if not model_path.exists():
                raise FileNotFoundError(f"DDColor model file {model_path} not found")

            # Configure device
            device = self.get_device(device_name)

            # Build model
            model = build_ddcolor_model(
                DDColor,
                model_path=str(model_path),
                input_size=512,
                model_size="large",
                device=device,
            )

            # Create pipeline
            pipeline = ColorizationPipeline(model, input_size=512, device=device)
            self._models[cache_key] = pipeline

            logger.info(f"DDColor loaded and cached: {cache_key}")
            return pipeline

    def _download_ddcolor_model(self, model_name: str, target_path: Path):
        """Download DDColor model from HuggingFace Hub"""
        try:
            from huggingface_hub import hf_hub_download

            repo_map = {
                "artistic": "piddnad/ddcolor_artistic",
                "modelscope": "piddnad/ddcolor_modelscope",
            }

            repo_id = repo_map.get(model_name)
            if not repo_id:
                logger.error(f"Unknown DDColor model: {model_name}")
                return

            logger.info(f"Downloading DDColor {model_name} from HuggingFace...")
            downloaded_path = hf_hub_download(
                repo_id=repo_id,
                filename="pytorch_model.bin",
                local_dir=str(target_path.parent),
            )

            # Rename to our standard name
            bin_path = target_path.parent / "pytorch_model.bin"
            if bin_path.exists():
                os.rename(str(bin_path), str(target_path))

            logger.info(f"DDColor {model_name} downloaded: {target_path}")
        except Exception as e:
            logger.error(f"Failed to download DDColor model: {e}")

    # Keep legacy DeOldify methods for backward compatibility (video colorization)
    def _setup_model_directory(self, model_path: Path) -> Path:
        """Prepare DeOldify's expected ``<root>/models/*.pth`` layout.

        DeOldify hardcodes FastAI's ``learn.load()`` convention, which reads
        weights from ``root_folder/models``. The application keeps canonical
        model weights in ``ai_models`` to avoid mixing runtime weights with ORM
        modules, so the worker creates a process-local hardlink/copy in temp.
        """
        runtime_root = Path(
            os.getenv(
                "DEOLDIFY_RUNTIME_ROOT",
                str(Path(tempfile.gettempdir()) / "ayu-colorizex" / "deoldify"),
            )
        )
        target_dir = runtime_root / "models"
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / model_path.name

        if target_path.exists():
            if target_path.stat().st_size == model_path.stat().st_size:
                return runtime_root
            target_path.unlink()

        try:
            os.link(model_path, target_path)
        except OSError:
            shutil.copy2(model_path, target_path)

        return runtime_root

    def get_video_colorizer(self, device_name: str = "cpu"):
        """
        Get or create DeOldify video colorizer with caching.
        Video colorization still uses DeOldify as DDColor doesn't support video natively.
        """
        cache_key = f"video_colorizer_{device_name}"

        with self._model_lock:
            if cache_key in self._models:
                logger.info(f"Using cached video colorizer: {cache_key}")
                return self._models[cache_key]

            logger.info(f"Loading video colorizer: {cache_key}")

            try:
                from deoldify.visualize import get_stable_video_colorizer
            except Exception as exc:
                logger.exception("DeOldify could not be imported for video colorization: %s", exc)
                return None

            # Model path — respects AI_MODELS_DIR from settings/.env
            models_dir = _get_models_dir()
            video_model_path = models_dir / "ColorizeVideo_gen.pth"

            if not video_model_path.exists():
                raise FileNotFoundError(f"Video model file {video_model_path} not found")

            # Setup DeOldify-compatible model directory without polluting backend/models.
            runtime_root = self._setup_model_directory(video_model_path)

            # Configure device
            device = self.get_device(device_name)
            if device.type == 'cpu':
                torch.backends.cudnn.enabled = False
            else:
                torch.backends.cudnn.enabled = True

            # PyTorch 2.6+ changed default weights_only=True which breaks deoldify/fastai.
            # Load to CPU first (avoids serialization issues), then move to target device.
            _original_torch_load = torch.load
            def _patched_torch_load(f, map_location=None, pickle_module=None, **kwargs):
                kwargs['weights_only'] = False
                if pickle_module is not None:
                    return _original_torch_load(f, map_location='cpu', pickle_module=pickle_module, **kwargs)
                return _original_torch_load(f, map_location='cpu', **kwargs)
            torch.load = _patched_torch_load

            # Set fastai default device BEFORE loading — fastai moves model to this device
            try:
                from fastai.torch_core import defaults
                defaults.device = device
                logger.info(f"FastAI default device set to: {device}")
            except Exception as e:
                logger.warning(f"Could not set fastai default device: {e}")

            # Patch FastAI purge() — on Windows, purge() causes PermissionError (WinError 32)
            # when it tries to remove a temp file while it's still open. Make it a no-op.
            try:
                import fastai.basic_train as _fbt
                _fbt.Learner.purge = lambda self_learner, *a, **kw: self_learner
            except Exception:
                pass

            # Create video colorizer
            try:
                video_colorizer = get_stable_video_colorizer(
                    root_folder=runtime_root,
                    weights_name=video_model_path.stem,
                )
                # fastai defaults.device was already set before loading,
                # so the model is on the correct device automatically.
            finally:
                torch.load = _original_torch_load  # Always restore original torch.load

            self._models[cache_key] = video_colorizer

            logger.info(f"Video colorizer loaded and cached: {cache_key}")
            return video_colorizer

    def clear_cache(self, model_key: Optional[str] = None):
        """Clear specific model or all models from cache"""
        with self._model_lock:
            if model_key:
                if model_key in self._models:
                    del self._models[model_key]
                    logger.info(f"Cleared model from cache: {model_key}")
            else:
                self._models.clear()
                logger.info("Cleared all models from cache")

                # Force garbage collection
                import gc
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

    def get_cache_info(self) -> Dict[str, Any]:
        """Get information about cached models"""
        with self._model_lock:
            return {
                "cached_models": list(self._models.keys()),
                "count": len(self._models),
                "cuda_available": torch.cuda.is_available(),
                "cuda_memory_allocated": torch.cuda.memory_allocated() if torch.cuda.is_available() else 0
            }


# Global instance
model_cache = ModelCache()
