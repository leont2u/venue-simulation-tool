import logging

from celery import shared_task

from venue_cv.models import CVJob, SceneGraph, DetectedObject, AssetMapping
from venue_cv.pipeline.context import update_stage
from venue_cv.services.asset_service import AssetMatchingService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, queue="cpu", name="venue_cv.asset_matching.match_assets")
def match_assets(self, job_id: str) -> None:
    """
    Stage 5 — map every detected object class to a 3D asset.

    Priority: internal library → Poly Pizza → Sketchfab → primitive fallback.
    """
    update_stage(job_id, "asset_matching", "processing", pct=5)
    try:
        job = CVJob.objects.get(id=job_id)
        sg  = SceneGraph.objects.get(job=job)

        # Collect unique classes from the scene graph objects
        objects = sg.graph_json.get("objects", [])
        seen_classes: dict[str, str] = {}  # class_name → object_id

        detected_map: dict[str, DetectedObject | None] = {}
        for image in job.images.all():
            if hasattr(image, "detection"):
                for det_obj in image.detection.detected_objects.all():
                    detected_map[det_obj.class_name] = det_obj

        svc = AssetMatchingService()
        bulk_create = []

        for i, obj in enumerate(objects):
            class_name = obj["type"]
            if class_name in seen_classes:
                continue
            seen_classes[class_name] = obj["id"]

            match = svc.match(class_name)
            det_obj = detected_map.get(class_name)

            bulk_create.append(AssetMapping(
                scene_graph     = sg,
                detected_object = det_obj,
                class_name      = class_name,
                asset_source    = match["source"],
                asset_id        = match["asset_id"],
                asset_url       = match["asset_url"],
                scale_x         = match["scale"][0],
                scale_y         = match["scale"][1],
                scale_z         = match["scale"][2],
                confidence      = match["confidence"],
            ))

            pct = int((i + 1) / len(objects) * 100)
            update_stage(job_id, "asset_matching", "processing", pct=pct)

        # Wipe old mappings and write fresh ones
        AssetMapping.objects.filter(scene_graph=sg).delete()
        if bulk_create:
            AssetMapping.objects.bulk_create(bulk_create)

        update_stage(job_id, "asset_matching", "success")
        logger.info("asset_matching done for job %s — %d assets mapped", job_id, len(bulk_create))
    except Exception as exc:
        update_stage(job_id, "asset_matching", "failed", str(exc))
        logger.exception("asset_matching failed for job %s", job_id)
        raise self.retry(exc=exc, countdown=10)
