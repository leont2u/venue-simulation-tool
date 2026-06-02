import logging

from celery import shared_task

from venue_cv.models import CVJob, DetectionResult, DetectedObject
from venue_cv.pipeline.constants import VENUE_DETECTION_CLASSES, YOLO_CONFIDENCE_THRESHOLD
from venue_cv.pipeline.context import update_stage
from venue_cv.services.yolo_service import YOLOWorldService

logger = logging.getLogger(__name__)


def _run_detection_for_job(job_id: str) -> None:
    job = CVJob.objects.prefetch_related("images").get(id=job_id)
    service = YOLOWorldService(
        classes=VENUE_DETECTION_CLASSES,
        confidence_threshold=YOLO_CONFIDENCE_THRESHOLD,
    )
    images = list(job.images.all())
    for i, image in enumerate(images):
        if not image.processed_file:
            continue
        detections = service.detect(image.processed_file.path)
        result = DetectionResult.objects.create(image=image, raw_output=detections)
        DetectedObject.objects.bulk_create([
            DetectedObject(
                result=result,
                class_name=d["class"],
                confidence=d["confidence"],
                bbox_x1=d["bbox"][0],
                bbox_y1=d["bbox"][1],
                bbox_x2=d["bbox"][2],
                bbox_y2=d["bbox"][3],
            )
            for d in detections
        ])
        pct = int((i + 1) / len(images) * 100)
        update_stage(job_id, "object_detection", "processing", pct=pct)


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.object_detection.run_yolo_world")
def run_yolo_world(self, job_id: str) -> None:
    """YOLO World object detection — single image."""
    update_stage(job_id, "object_detection", "processing", pct=5)
    try:
        _run_detection_for_job(job_id)
        update_stage(job_id, "object_detection", "success")
        logger.info("object_detection done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "object_detection", "failed", str(exc))
        logger.exception("object_detection failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.object_detection.run_yolo_world_batch")
def run_yolo_world_batch(self, job_id: str) -> None:
    """YOLO World object detection — batch (multi-image mode)."""
    update_stage(job_id, "object_detection", "processing", pct=5)
    try:
        _run_detection_for_job(job_id)
        update_stage(job_id, "object_detection", "success")
    except Exception as exc:
        update_stage(job_id, "object_detection", "failed", str(exc))
        raise self.retry(exc=exc, countdown=15)
