import logging

from celery import shared_task

from venue_cv.models import CVJob, RoomLayoutResult
from venue_cv.pipeline.context import update_stage
from venue_cv.services.roomformer_service import RoomFormerService

logger = logging.getLogger(__name__)


def _run_room_layout_for_job(job_id: str) -> None:
    job = CVJob.objects.prefetch_related("images").get(id=job_id)
    service = RoomFormerService()

    for image in job.images.all():
        if not image.processed_file:
            continue
        layout = service.extract(image.processed_file.path)
        RoomLayoutResult.objects.update_or_create(
            image=image,
            defaults={
                "walls":      layout["walls"],
                "floor":      layout["floor"],
                "ceiling":    layout["ceiling"],
                "windows":    layout["windows"],
                "doors":      layout["doors"],
                "room_width": layout["room_width"],
                "room_depth": layout["room_depth"],
                "room_height":layout["room_height"],
                "confidence": layout["confidence"],
            },
        )


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.room_layout.run_roomformer")
def run_roomformer(self, job_id: str) -> None:
    """HorizonNet-based room layout estimation — extracts walls, floor, ceiling, doors, windows."""
    update_stage(job_id, "room_layout", "processing", pct=5)
    try:
        _run_room_layout_for_job(job_id)
        update_stage(job_id, "room_layout", "success")
        logger.info("room_layout done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "room_layout", "failed", str(exc))
        logger.exception("room_layout failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=15)


@shared_task(bind=True, max_retries=2, queue="gpu", name="venue_cv.room_layout.run_roomformer_batch")
def run_roomformer_batch(self, job_id: str) -> None:
    """Room layout estimation — multi-image batch."""
    update_stage(job_id, "room_layout", "processing", pct=5)
    try:
        _run_room_layout_for_job(job_id)
        update_stage(job_id, "room_layout", "success")
    except Exception as exc:
        update_stage(job_id, "room_layout", "failed", str(exc))
        raise self.retry(exc=exc, countdown=15)
