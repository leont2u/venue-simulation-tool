import logging

from celery import shared_task

from venue_cv.models import CVJob, SceneGraph
from venue_cv.pipeline.context import update_stage
from venue_cv.services.fusion_service import DepthFusionService
from venue_cv.services.scene_graph_service import SceneGraphService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.scene_graph.fuse_detections")
def fuse_detections(self, job_id: str) -> None:
    """
    Stage 3 — single image fusion.

    Runs after the stage-2 chord completes. Lifts 2D detections to 3D
    world coordinates using the depth map and room layout, then builds
    the structured SceneGraph.
    """
    update_stage(job_id, "scene_graph", "processing", pct=10)
    try:
        job = CVJob.objects.get(id=job_id)

        # Fuse depth + bboxes → world positions on all DetectedObjects
        fusion = DepthFusionService()
        for image in job.images.all():
            fusion.fuse(str(image.id))
        update_stage(job_id, "scene_graph", "processing", pct=50)

        # Build the full scene graph JSON
        builder = SceneGraphService()
        graph_json = builder.build(job_id)

        SceneGraph.objects.update_or_create(
            job=job,
            defaults={
                "room_width":  graph_json["room"]["width"],
                "room_depth":  graph_json["room"]["depth"],
                "room_height": graph_json["room"]["height"],
                "graph_json":  graph_json,
                "confidence":  graph_json.get("confidence"),
            },
        )

        update_stage(job_id, "scene_graph", "success")
        logger.info("scene_graph built for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "scene_graph", "failed", str(exc))
        logger.exception("scene_graph failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=10)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.scene_graph.fuse_multi_image")
def fuse_multi_image(self, job_id: str) -> None:
    """Stage 3 — multi-image mode: also incorporates SfM camera poses."""
    update_stage(job_id, "scene_graph", "processing", pct=10)
    try:
        job = CVJob.objects.get(id=job_id)

        fusion = DepthFusionService()
        for image in job.images.all():
            fusion.fuse(str(image.id))
        update_stage(job_id, "scene_graph", "processing", pct=50)

        builder = SceneGraphService()
        graph_json = builder.build(job_id, use_sfm=True)

        SceneGraph.objects.update_or_create(
            job=job,
            defaults={
                "room_width":  graph_json["room"]["width"],
                "room_depth":  graph_json["room"]["depth"],
                "room_height": graph_json["room"]["height"],
                "graph_json":  graph_json,
                "confidence":  graph_json.get("confidence"),
            },
        )

        update_stage(job_id, "scene_graph", "success")
    except Exception as exc:
        update_stage(job_id, "scene_graph", "failed", str(exc))
        raise self.retry(exc=exc, countdown=10)


@shared_task(bind=True, max_retries=1, queue="cpu", name="venue_cv.scene_graph.build_from_mesh")
def build_from_mesh(self, job_id: str) -> None:
    """Stage 3 — video mode: builds scene graph from the extracted mesh geometry."""
    update_stage(job_id, "scene_graph", "processing", pct=10)
    try:
        job    = CVJob.objects.get(id=job_id)
        sfm    = job.sfm
        mesh_path = sfm.mesh_file.path if sfm.mesh_file else None

        builder    = SceneGraphService()
        graph_json = builder.build_from_mesh(job_id, mesh_path)

        SceneGraph.objects.update_or_create(
            job=job,
            defaults={
                "room_width":  graph_json["room"]["width"],
                "room_depth":  graph_json["room"]["depth"],
                "room_height": graph_json["room"]["height"],
                "graph_json":  graph_json,
                "confidence":  graph_json.get("confidence"),
            },
        )

        update_stage(job_id, "scene_graph", "success")
    except Exception as exc:
        update_stage(job_id, "scene_graph", "failed", str(exc))
        raise self.retry(exc=exc, countdown=10)
