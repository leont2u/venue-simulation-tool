import logging

from celery import shared_task

from venue_cv.models import CVJob, DepthResult
from venue_cv.pipeline.context import update_stage
from venue_cv.services.depth_service import DepthAnythingService

logger = logging.getLogger(__name__)


def _run_depth_for_job(job_id: str) -> None:
    job = CVJob.objects.prefetch_related("images").get(id=job_id)
    service = DepthAnythingService()

    for image in job.images.all():
        if not image.processed_file:
            continue
        result = service.estimate(image.processed_file.path)
        DepthResult.objects.update_or_create(
            image=image,
            defaults={
                "depth_map_file": result["depth_map_path"],
                "min_depth":      result["min_depth"],
                "max_depth":      result["max_depth"],
                "scale_factor":   result.get("scale_factor"),
            },
        )


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.depth_estimation.run_depth_anything")
def run_depth_anything(self, job_id: str) -> None:
    """Depth Anything V2 — monocular depth estimation."""
    update_stage(job_id, "depth_estimation", "processing", pct=5)
    try:
        _run_depth_for_job(job_id)
        update_stage(job_id, "depth_estimation", "success")
        logger.info("depth_estimation done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "depth_estimation", "failed", str(exc))
        logger.exception("depth_estimation failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.depth_estimation.run_depth_anything_batch")
def run_depth_anything_batch(self, job_id: str) -> None:
    """Depth Anything V2 — multi-image batch."""
    update_stage(job_id, "depth_estimation", "processing", pct=5)
    try:
        _run_depth_for_job(job_id)
        update_stage(job_id, "depth_estimation", "success")
    except Exception as exc:
        update_stage(job_id, "depth_estimation", "failed", str(exc))
        raise self.retry(exc=exc, countdown=15)
