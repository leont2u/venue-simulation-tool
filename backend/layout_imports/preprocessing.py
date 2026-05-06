from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np


MAX_IMAGE_SIDE = 2200
SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


@dataclass(frozen=True)
class PreprocessedFloorPlan:
    image: np.ndarray
    gray: np.ndarray
    binary: np.ndarray
    edges: np.ndarray
    scale_factor: float
    source_width: int
    source_height: int


def _pdf_bytes_to_image(file_bytes: bytes) -> np.ndarray:
    try:
        import fitz
    except ImportError as exc:
        raise ValueError(
            "PDF imports require PyMuPDF. Install backend requirements and try again."
        ) from exc

    document = fitz.open(stream=file_bytes, filetype="pdf")
    if document.page_count == 0:
        raise ValueError("The uploaded PDF does not contain any pages.")

    page = document.load_page(0)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixels = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(
        pixmap.height,
        pixmap.width,
        pixmap.n,
    )
    return cv2.cvtColor(pixels, cv2.COLOR_RGB2BGR)


def _image_bytes_to_array(file_bytes: bytes) -> np.ndarray:
    encoded = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("The uploaded image could not be decoded.")
    return image


def load_floorplan_image(file_bytes: bytes, file_name: str) -> np.ndarray:
    extension = Path(file_name).suffix.lower()
    if extension == ".pdf":
        return _pdf_bytes_to_image(file_bytes)
    if extension in SUPPORTED_IMAGE_EXTENSIONS:
        return _image_bytes_to_array(file_bytes)
    raise ValueError("Unsupported floor plan file type. Upload PNG, JPG, JPEG, or PDF.")


def preprocess_floorplan(file_bytes: bytes, file_name: str) -> PreprocessedFloorPlan:
    image = load_floorplan_image(file_bytes, file_name)
    source_height, source_width = image.shape[:2]
    longest_side = max(source_width, source_height)
    resize_scale = min(1.0, MAX_IMAGE_SIDE / max(1, longest_side))

    if resize_scale < 1:
        image = cv2.resize(
            image,
            None,
            fx=resize_scale,
            fy=resize_scale,
            interpolation=cv2.INTER_AREA,
        )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 7, 45, 45)
    binary = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        35,
        9,
    )

    cleanup_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cleanup_kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, cleanup_kernel, iterations=1)
    edges = cv2.Canny(denoised, 50, 150, apertureSize=3)

    return PreprocessedFloorPlan(
        image=image,
        gray=denoised,
        binary=binary,
        edges=edges,
        scale_factor=resize_scale,
        source_width=source_width,
        source_height=source_height,
    )
