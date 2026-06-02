"""
Helpers for updating per-stage progress on a CVJob.
Imported by every Celery task to mark stage state transitions.
"""
import logging
from datetime import datetime, timezone

from venue_cv.models import CVJob, JobStatus, PipelineStage

logger = logging.getLogger(__name__)


def update_stage(
    job_id: str,
    stage: str,
    status: str,
    error: str = "",
    pct: int = 0,
) -> None:
    """
    Update the stage_progress JSON field and current_stage on a CVJob.

    status values: "processing" | "success" | "failed"
    """
    try:
        job = CVJob.objects.get(id=job_id)
        now = datetime.now(tz=timezone.utc).isoformat()

        entry = job.stage_progress.get(stage, {})

        if status == "processing":
            entry.update({"status": "processing", "pct": pct, "started_at": now})
            job.current_stage = stage
            job.status = JobStatus.PROCESSING

        elif status == "success":
            entry.update({"status": "success", "pct": 100, "finished_at": now})

        elif status == "failed":
            entry.update({"status": "failed", "pct": pct, "error": error, "finished_at": now})
            job.status = JobStatus.FAILED
            job.current_stage = PipelineStage.FAILED
            job.error_message = error

        job.stage_progress[stage] = entry
        job.save(update_fields=["status", "current_stage", "stage_progress", "error_message", "updated_at"])

    except CVJob.DoesNotExist:
        logger.error("update_stage: CVJob %s not found", job_id)
    except Exception:
        logger.exception("update_stage: unexpected error for job %s stage %s", job_id, stage)


def mark_complete(job_id: str) -> None:
    """Mark the entire job as successfully completed."""
    try:
        CVJob.objects.filter(id=job_id).update(
            status=JobStatus.SUCCESS,
            current_stage=PipelineStage.COMPLETE,
        )
    except Exception:
        logger.exception("mark_complete: failed for job %s", job_id)


def mark_failed(job_id: str, error: str) -> None:
    """Mark the entire job as failed."""
    try:
        CVJob.objects.filter(id=job_id).update(
            status=JobStatus.FAILED,
            current_stage=PipelineStage.FAILED,
            error_message=error,
        )
    except Exception:
        logger.exception("mark_failed: failed for job %s", job_id)
