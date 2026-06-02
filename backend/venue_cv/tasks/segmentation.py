import logging

from celery import shared_task

from venue_cv.models import CVJob, DetectedObject
from venue_cv.pipeline.context import update_stage
from venue_cv.services.sam_service import SAM2Service

logger = logging.getLogger(__name__)


def _run_segmentation_for_job(job_id: str) -> None:
    job = CVJob.objects.prefetch_related("images__detection__objects").get(id=job_id)
    service = SAM2Service()

    for image in job.images.all():
        if not hasattr(image, "detection"):
            continue
        objects = list(image.detection.detected_objects.all())
        if not objects:
            continue

        bboxes = [
            [o.bbox_x1, o.bbox_y1, o.bbox_x2, o.bbox_y2]
            for o in objects
        ]
        mask_paths = service.segment(image.processed_file.path, bboxes)

        updates = []
        for obj, mask_path in zip(objects, mask_paths):
            if mask_path:
                obj.mask_file = mask_path
                updates.append(obj)
        if updates:
            DetectedObject.objects.bulk_update(updates, ["mask_file"])


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.segmentation.run_sam2")
def run_sam2(self, job_id: str) -> None:
    """SAM 2 instance segmentation — produces per-object masks."""
    update_stage(job_id, "segmentation", "processing", pct=5)
    try:
        _run_segmentation_for_job(job_id)
        update_stage(job_id, "segmentation", "success")
        logger.info("segmentation done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "segmentation", "failed", str(exc))
        logger.exception("segmentation failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.segmentation.run_sam2_batch")
def run_sam2_batch(self, job_id: str) -> None:
    """SAM 2 segmentation — multi-image batch."""
    update_stage(job_id, "segmentation", "processing", pct=5)
    try:
        _run_segmentation_for_job(job_id)
        update_stage(job_id, "segmentation", "success")
    except Exception as exc:
        update_stage(job_id, "segmentation", "failed", str(exc))
        raise self.retry(exc=exc, countdown=15)
