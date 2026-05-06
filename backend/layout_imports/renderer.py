import cv2
import numpy as np

from .detection import understand_floorplan
from .photo_reconstruction import reconstruct_project_from_photo
from .preprocessing import preprocess_floorplan
from .reconstruction import reconstruct_project_from_understanding


def _is_photo_like(plan):
    image = plan.image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    mean_saturation = float(hsv[:, :, 1].mean())
    white_ratio = float(np.mean(gray > 235))

    # Floor plans are usually very low-saturation drawings with a mostly white canvas.
    # Venue photos have richer color and much less pure white background.
    return mean_saturation > 12 and white_ratio < 0.72


def floorplan_file_to_project(
    file_bytes: bytes,
    file_name: str,
    project_name: str | None = None,
    px_to_meter: float | None = None,
):
    preprocessed = preprocess_floorplan(file_bytes, file_name)
    if _is_photo_like(preprocessed):
        return reconstruct_project_from_photo(
            preprocessed,
            file_name=file_name,
            project_name=project_name,
        )

    understanding = understand_floorplan(preprocessed)
    if not understanding["walls"] and not understanding["rooms"]:
        raise ValueError("No floor plan geometry was detected in the uploaded file.")

    return reconstruct_project_from_understanding(
        understanding,
        file_name=file_name,
        project_name=project_name,
        px_to_meter=px_to_meter,
    )
