import logging

from celery import shared_task

from venue_cv.models import CVJob, SceneGraph
from venue_cv.pipeline.context import update_stage
from venue_cv.services.llm_service import LLMReasoningService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, queue="llm", name="venue_cv.llm_reasoning.run_gemma3")
def run_gemma3(self, job_id: str) -> None:
    """
    Stage 4 — LLM reasoning via Gemma 3 (Ollama).

    Enriches the scene graph with venue type, layout style, capacity
    estimate, and geometry corrections.
    """
    update_stage(job_id, "llm_reasoning", "processing", pct=5)
    try:
        job = CVJob.objects.get(id=job_id)
        sg  = SceneGraph.objects.get(job=job)

        svc           = LLMReasoningService()
        reasoning_out = svc.reason(sg.graph_json)

        # Merge semantic output into the graph JSON
        updated_graph = dict(sg.graph_json)
        updated_graph["semantic"] = reasoning_out

        SceneGraph.objects.filter(id=sg.id).update(
            venue_type          = reasoning_out.get("venue_type", ""),
            layout_type         = reasoning_out.get("event_setup_style", ""),
            capacity_est        = reasoning_out.get("capacity_estimate"),
            llm_reasoning_json  = reasoning_out,
            graph_json          = updated_graph,
        )

        update_stage(job_id, "llm_reasoning", "success")
        logger.info("llm_reasoning done for job %s — venue_type=%s", job_id, reasoning_out.get("venue_type"))
    except Exception as exc:
        update_stage(job_id, "llm_reasoning", "failed", str(exc))
        logger.exception("llm_reasoning failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=20)
