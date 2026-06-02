import logging

from celery import shared_task

from venue_cv.models import CVJob, SfMResult
from venue_cv.pipeline.context import update_stage
from venue_cv.services.colmap_service import COLMAPService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1, queue="gpu", name="venue_cv.sfm.run_colmap")
def run_colmap(self, job_id: str) -> None:
    """
    COLMAP Structure-from-Motion.

    Produces camera poses, sparse point cloud, and optionally a dense
    reconstruction from multiple images or extracted video frames.
    """
    update_stage(job_id, "sfm", "processing", pct=5)
    try:
        job = CVJob.objects.prefetch_related("images").get(id=job_id)
        image_paths = [
            img.processed_file.path
            for img in job.images.all()
            if img.processed_file
        ]
        service = COLMAPService()
        result  = service.reconstruct(job_id, image_paths)

        sfm, _ = SfMResult.objects.update_or_create(
            job=job,
            defaults={
                "camera_poses":      result["camera_poses"],
                "sparse_cloud_file": result.get("sparse_cloud_path", ""),
                "dense_cloud_file":  result.get("dense_cloud_path", ""),
                "mesh_file":         result.get("mesh_path", ""),
            },
        )
        update_stage(job_id, "sfm", "success")
        logger.info("sfm done for job %s — %d poses", job_id, len(result["camera_poses"]))
    except Exception as exc:
        update_stage(job_id, "sfm", "failed", str(exc))
        logger.exception("sfm failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=30)
