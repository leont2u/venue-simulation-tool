import logging

from celery import shared_task

from venue_cv.models import CVJob, SceneGraph
from venue_cv.pipeline.context import update_stage, mark_complete
from venue_cv.services.scene_gen_service import SceneGenService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.scene_generation.generate_scene")
def generate_scene(self, job_id: str) -> None:
    """
    Stage 6 — produce the final Project JSON from the enriched scene graph.

    The generated JSON is stored on the SceneGraph model and is ready
    for the frontend to call /accept/ which creates a real Project.
    """
    update_stage(job_id, "scene_generation", "processing", pct=10)
    try:
        job = CVJob.objects.get(id=job_id)
        sg  = SceneGraph.objects.prefetch_related("asset_mappings").get(job=job)

        svc          = SceneGenService()
        project_json = svc.generate(sg)

        # Store the generated project JSON inside the scene graph for preview
        graph = dict(sg.graph_json)
        graph["_generated_project"] = project_json
        SceneGraph.objects.filter(id=sg.id).update(graph_json=graph)

        update_stage(job_id, "scene_generation", "success")
        mark_complete(job_id)
        logger.info("scene_generation done for job %s", job_id)
    except Exception as exc:
        update_stage(job_id, "scene_generation", "failed", str(exc))
        logger.exception("scene_generation failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=10)
