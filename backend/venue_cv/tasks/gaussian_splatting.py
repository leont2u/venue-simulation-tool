import logging

from celery import shared_task

from venue_cv.models import CVJob, SfMResult
from venue_cv.pipeline.context import update_stage
from venue_cv.services.gaussian_service import GaussianSplattingService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1, queue="gpu", name="venue_cv.gaussian_splatting.run_gsplat")
def run_gsplat(self, job_id: str) -> None:
    """
    Gaussian Splatting — trains a 3D Gaussian representation from COLMAP output.
    Produces a splat file for mesh extraction.
    """
    update_stage(job_id, "gaussian_splat", "processing", pct=5)
    try:
        job = CVJob.objects.get(id=job_id)
        sfm = SfMResult.objects.get(job=job)
        svc = GaussianSplattingService()
        result = svc.train(job_id=job_id, sfm_sparse_path=sfm.sparse_cloud_file.path)
        SfMResult.objects.filter(job=job).update(dense_cloud_file=result["splat_path"])
        update_stage(job_id, "gaussian_splat", "success")
        logger.info("gaussian splatting done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "gaussian_splat", "failed", str(exc))
        logger.exception("gaussian splatting failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=1, queue="gpu", name="venue_cv.gaussian_splatting.extract_mesh")
def extract_mesh(self, job_id: str) -> None:
    """Extract a watertight mesh from the trained Gaussian splat."""
    try:
        job = CVJob.objects.get(id=job_id)
        sfm = SfMResult.objects.get(job=job)
        svc = GaussianSplattingService()
        result = svc.extract_mesh(job_id=job_id, splat_path=sfm.dense_cloud_file.path)
        SfMResult.objects.filter(job=job).update(mesh_file=result["mesh_path"])
        logger.info("mesh extraction done for job %s", job_id)
    except Exception as exc:
        logger.exception("mesh extraction failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=30)
