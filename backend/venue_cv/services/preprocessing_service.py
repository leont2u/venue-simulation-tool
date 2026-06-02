import io
import logging
import os
from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile

from venue_cv.pipeline.constants import PROCESSED_IMAGE_SIZE

logger = logging.getLogger(__name__)

try:
    from PIL import Image as PILImage
    import piexif
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    logger.warning("Pillow not installed — preprocessing will copy files unchanged")


class PreprocessingService:
    """
    Stage 1: normalise an uploaded image for downstream ML models.

    Operations (in order):
    1. Convert HEIC / PNG / TIFF → JPEG
    2. Resize so the longest edge = PROCESSED_IMAGE_SIZE (default 1024px)
    3. Pad to square with black border
    4. Extract EXIF metadata (focal length, GPS)
    5. Enhance contrast with CLAHE (optional)
    """

    def process(self, venue_image) -> None:
        """Mutates the VenueImage: sets processed_file, width, height, exif_data."""
        if not venue_image.original_file:
            raise ValueError("VenueImage has no original_file")

        src_path = venue_image.original_file.path

        if PILLOW_AVAILABLE:
            self._process_with_pillow(venue_image, src_path)
        else:
            # Graceful fallback: copy original as processed
            self._copy_as_processed(venue_image, src_path)

    def _process_with_pillow(self, venue_image, src_path: str) -> None:
        import cv2
        import numpy as np

        img = PILImage.open(src_path).convert("RGB")

        # Extract EXIF
        exif = self._extract_exif(img)

        # Resize so longest edge = target size
        w, h = img.size
        if max(w, h) > PROCESSED_IMAGE_SIZE:
            scale = PROCESSED_IMAGE_SIZE / max(w, h)
            img   = img.resize((int(w * scale), int(h * scale)), PILImage.LANCZOS)

        # Square-pad with black border
        w, h  = img.size
        canvas = PILImage.new("RGB", (PROCESSED_IMAGE_SIZE, PROCESSED_IMAGE_SIZE), (0, 0, 0))
        offset = ((PROCESSED_IMAGE_SIZE - w) // 2, (PROCESSED_IMAGE_SIZE - h) // 2)
        canvas.paste(img, offset)

        # CLAHE contrast enhancement (via OpenCV)
        arr = np.array(canvas)
        lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        arr = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        enhanced = PILImage.fromarray(arr)

        # Save to memory → Django FileField
        buf = io.BytesIO()
        enhanced.save(buf, format="JPEG", quality=92)
        buf.seek(0)

        filename = Path(venue_image.original_file.name).stem + "_processed.jpg"
        venue_image.processed_file.save(
            f"cv/processed/{filename}",
            ContentFile(buf.read()),
            save=False,
        )
        venue_image.width    = PROCESSED_IMAGE_SIZE
        venue_image.height   = PROCESSED_IMAGE_SIZE
        venue_image.exif_data = exif
        venue_image.save(update_fields=["processed_file", "width", "height", "exif_data"])

    def _copy_as_processed(self, venue_image, src_path: str) -> None:
        with open(src_path, "rb") as f:
            data = f.read()
        filename = Path(venue_image.original_file.name).stem + "_processed.jpg"
        venue_image.processed_file.save(
            f"cv/processed/{filename}",
            ContentFile(data),
            save=False,
        )
        venue_image.save(update_fields=["processed_file"])

    def _extract_exif(self, img: "PILImage.Image") -> dict:
        try:
            raw = img.info.get("exif", b"")
            if not raw:
                return {}
            exif_dict = piexif.load(raw)
            exif_out  = {}

            # Focal length
            focal = exif_dict.get("Exif", {}).get(piexif.ExifIFD.FocalLength)
            if focal and isinstance(focal, tuple):
                exif_out["focal_length_mm"] = focal[0] / focal[1] if focal[1] else None

            # GPS
            gps = exif_dict.get("GPS", {})
            if gps:
                exif_out["has_gps"] = True

            return exif_out
        except Exception:
            return {}
