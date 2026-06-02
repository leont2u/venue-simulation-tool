import logging
from typing import ClassVar

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLOWorld as _YOLOWorld
    import torch
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed — YOLO will return mock detections")


class YOLOWorldService:
    """
    Wraps YOLO World (ultralytics) for open-vocabulary object detection.
    The model is loaded once per worker process (class-level singleton).
    """

    _model: ClassVar = None

    def __init__(self, classes: list[str], confidence_threshold: float = 0.30):
        self.classes = classes
        self.conf    = confidence_threshold
        if YOLO_AVAILABLE and YOLOWorldService._model is None:
            try:
                YOLOWorldService._model = _YOLOWorld("yolov8x-worldv2.pt")
                if torch.cuda.is_available():
                    YOLOWorldService._model.to("cuda")
                logger.info("YOLO World model loaded on %s", "cuda" if torch.cuda.is_available() else "cpu")
            except Exception:
                logger.exception("Failed to load YOLO World model")

    def detect(self, image_path: str) -> list[dict]:
        """
        Returns a list of detections:
        [{ "class": str, "confidence": float, "bbox": [x1,y1,x2,y2] }]
        """
        if not YOLO_AVAILABLE or YOLOWorldService._model is None:
            return self._mock_detections()

        try:
            model = YOLOWorldService._model
            model.set_classes(self.classes)
            results = model.predict(image_path, conf=self.conf, verbose=False)
            output  = []
            for r in results:
                for box in r.boxes:
                    cls_idx = int(box.cls)
                    if cls_idx >= len(self.classes):
                        continue
                    output.append({
                        "class":      self.classes[cls_idx],
                        "confidence": float(box.conf),
                        "bbox":       box.xyxy[0].tolist(),
                    })
            return output
        except Exception:
            logger.exception("YOLO inference failed for %s", image_path)
            return []

    def _mock_detections(self) -> list[dict]:
        """Fallback when ultralytics is not installed (development / CI)."""
        return [
            {"class": "chair",  "confidence": 0.92, "bbox": [100, 200, 200, 350]},
            {"class": "table",  "confidence": 0.88, "bbox": [50,  280, 500, 430]},
            {"class": "window", "confidence": 0.75, "bbox": [600, 50,  900, 350]},
        ]
