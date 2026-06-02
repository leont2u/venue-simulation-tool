import logging
import os
import subprocess
from pathlib import Path

from celery import shared_task
from django.conf import settings

from venue_cv.models import CVJob, VenueImage, VenueVideo
from venue_cv.pipeline.constants import VIDEO_EXTRACT_FPS, PROCESSED_IMAGE_SIZE
from venue_cv.pipeline.context import update_stage
from venue_cv.services.preprocessing_service import PreprocessingService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1, queue="cpu", name="venue_cv.video_processing.extract_frames")
def extract_frames(self, job_id: str) -> None:
    """
    Extract frames from the uploaded video at VIDEO_EXTRACT_FPS.
    Each frame is saved as a VenueImage and preprocessed immediately.
    """
    update_stage(job_id, "preprocessing", "processing", pct=5)
    try:
        job   = CVJob.objects.prefetch_related("videos").get(id=job_id)
        video = job.videos.first()
        if not video:
            raise ValueError("No video found for job %s" % job_id)

        output_dir = Path(settings.MEDIA_ROOT) / "cv" / "frames" / str(job_id)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Extract frames with ffmpeg
        pattern = str(output_dir / "frame_%04d.jpg")
        subprocess.run(
            [
                "ffmpeg", "-i", video.original_file.path,
                "-vf", f"fps={VIDEO_EXTRACT_FPS},scale={PROCESSED_IMAGE_SIZE}:-1",
                "-q:v", "2", pattern, "-y",
            ],
            check=True,
            capture_output=True,
        )

        frame_files = sorted(output_dir.glob("frame_*.jpg"))
        if not frame_files:
            raise RuntimeError("ffmpeg produced no frames")

        svc = PreprocessingService()
        for seq, frame_path in enumerate(frame_files):
            rel_path = os.path.relpath(str(frame_path), settings.MEDIA_ROOT)
            venue_img = VenueImage.objects.create(
                job=job,
                sequence=seq,
                original_file=rel_path,
            )
            svc.process(venue_img)
            pct = int((seq + 1) / len(frame_files) * 100)
            update_stage(job_id, "preprocessing", "processing", pct=pct)

        # Store frame count on the video record
        VenueVideo.objects.filter(id=video.id).update(frame_count=len(frame_files))

        update_stage(job_id, "preprocessing", "success")
        logger.info("extract_frames done for job %s — %d frames", job_id, len(frame_files))
    except Exception as exc:
        update_stage(job_id, "preprocessing", "failed", str(exc))
        logger.exception("extract_frames failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=30)
