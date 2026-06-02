import logging

from celery import shared_task

from venue_cv.models import CVJob
from venue_cv.pipeline.context import update_stage, mark_failed
from venue_cv.services.preprocessing_service import PreprocessingService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.preprocessing.normalize_image")
def normalize_image(self, job_id: str) -> None:
    """Stage 1 — single image: convert to JPEG, resize to 1024px, extract EXIF."""
    update_stage(job_id, "preprocessing", "processing", pct=10)
    try:
        job = CVJob.objects.get(id=job_id)
        svc = PreprocessingService()
        for image in job.images.all():
            svc.process(image)
        update_stage(job_id, "preprocessing", "success")
        logger.info("preprocessing done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "preprocessing", "failed", str(exc))
        logger.exception("preprocessing failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=5)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.preprocessing.normalize_images_batch")
def normalize_images_batch(self, job_id: str) -> None:
    """Stage 1 — multi-image: same as above but processes all images in sequence."""
    update_stage(job_id, "preprocessing", "processing", pct=5)
    try:
        job = CVJob.objects.get(id=job_id)
        svc = PreprocessingService()
        images = list(job.images.all())
        for i, image in enumerate(images):
            svc.process(image)
            pct = int((i + 1) / len(images) * 100)
            update_stage(job_id, "preprocessing", "processing", pct=pct)
        update_stage(job_id, "preprocessing", "success")
    except Exception as exc:
        update_stage(job_id, "preprocessing", "failed", str(exc))
        raise self.retry(exc=exc, countdown=5)
