import logging
import os
from pathlib import Path
from typing import ClassVar

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import torch
    import numpy as np
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    SAM2_AVAILABLE = True
except ImportError:
    SAM2_AVAILABLE = False
    logger.warning("sam2 not installed — segmentation will be skipped")


class SAM2Service:
    """
    Wraps Meta's SAM 2 for prompted instance segmentation.
    Given an image and bounding boxes, produces per-object binary masks.
    """

    _predictor: ClassVar = None

    def __init__(self):
        if SAM2_AVAILABLE and SAM2Service._predictor is None:
            try:
                checkpoint  = os.path.join(settings.BASE_DIR, "checkpoints", "sam2_hiera_large.pt")
                model_cfg   = "sam2_hiera_l.yaml"
                sam_model   = build_sam2(model_cfg, checkpoint, device="cuda" if torch.cuda.is_available() else "cpu")
                SAM2Service._predictor = SAM2ImagePredictor(sam_model)
                logger.info("SAM 2 predictor loaded")
            except Exception:
                logger.exception("Failed to load SAM 2 predictor")

    def segment(self, image_path: str, bboxes: list[list[float]]) -> list[str | None]:
        """
        Run SAM 2 with bounding-box prompts.

        Args:
            image_path: path to preprocessed 1024×1024 image
            bboxes: list of [x1, y1, x2, y2] in pixel coords

        Returns:
            List of mask file paths (relative to MEDIA_ROOT), one per bbox.
            None for any box where segmentation failed.
        """
        if not SAM2_AVAILABLE or SAM2Service._predictor is None or not bboxes:
            return [None] * len(bboxes)

        try:
            import cv2
            import numpy as np

            img     = cv2.imread(image_path)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            pred    = SAM2Service._predictor

            pred.set_image(img_rgb)
            mask_paths = []
            output_dir = Path(settings.MEDIA_ROOT) / "cv" / "masks"
            output_dir.mkdir(parents=True, exist_ok=True)

            for i, bbox in enumerate(bboxes):
                input_box = np.array(bbox)
                masks, _, _ = pred.predict(
                    box=input_box[None, :],
                    multimask_output=False,
                )
                mask = masks[0].astype(np.uint8) * 255

                stem     = Path(image_path).stem
                fname    = f"{stem}_mask_{i}.png"
                abs_path = output_dir / fname
                cv2.imwrite(str(abs_path), mask)

                rel_path = os.path.relpath(str(abs_path), settings.MEDIA_ROOT)
                mask_paths.append(rel_path)

            return mask_paths

        except Exception:
            logger.exception("SAM 2 segmentation failed for %s", image_path)
            return [None] * len(bboxes)
