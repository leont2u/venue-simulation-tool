import logging
import os
from pathlib import Path
from typing import ClassVar

import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from transformers import pipeline as hf_pipeline
    import torch
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    logger.warning("transformers not installed — depth estimation will produce synthetic maps")


class DepthAnythingService:
    """
    Wraps Depth Anything V2 (via HuggingFace transformers) for monocular
    depth estimation. The pipeline is loaded once per worker.
    """

    _pipe: ClassVar = None

    def __init__(self):
        if HF_AVAILABLE and DepthAnythingService._pipe is None:
            try:
                device = 0 if (torch.cuda.is_available()) else -1  # -1 = CPU
                DepthAnythingService._pipe = hf_pipeline(
                    task="depth-estimation",
                    model="depth-anything/Depth-Anything-V2-Large-hf",
                    device=device,
                )
                logger.info("Depth Anything V2 loaded on device=%s", device)
            except Exception:
                logger.exception("Failed to load Depth Anything V2")

    def estimate(self, image_path: str) -> dict:
        """
        Run depth estimation on the preprocessed image.

        Returns:
            {
                depth_map_path: str (relative to MEDIA_ROOT, .npy file),
                min_depth: float,
                max_depth: float,
                scale_factor: None  (metric scale unknown for monocular)
            }
        """
        if not HF_AVAILABLE or DepthAnythingService._pipe is None:
            return self._synthetic_depth(image_path)

        try:
            from PIL import Image as PILImage

            img    = PILImage.open(image_path).convert("RGB")
            result = DepthAnythingService._pipe(img)
            depth  = np.array(result["depth"], dtype=np.float32)

            return self._save_depth_map(image_path, depth)
        except Exception:
            logger.exception("Depth estimation failed for %s", image_path)
            return self._synthetic_depth(image_path)

    def _save_depth_map(self, image_path: str, depth: np.ndarray) -> dict:
        output_dir = Path(settings.MEDIA_ROOT) / "cv" / "depth"
        output_dir.mkdir(parents=True, exist_ok=True)
        stem  = Path(image_path).stem
        fname = f"{stem}_depth.npy"
        abs_path = output_dir / fname
        np.save(str(abs_path), depth)
        rel_path = os.path.relpath(str(abs_path), settings.MEDIA_ROOT)
        return {
            "depth_map_path": rel_path,
            "min_depth":      float(depth.min()),
            "max_depth":      float(depth.max()),
            "scale_factor":   None,
        }

    def _synthetic_depth(self, image_path: str) -> dict:
        """Linear gradient depth map as fallback for dev/testing."""
        h, w   = 1024, 1024
        depth  = np.tile(np.linspace(0.1, 1.0, w), (h, 1)).astype(np.float32)
        return self._save_depth_map(image_path, depth)
