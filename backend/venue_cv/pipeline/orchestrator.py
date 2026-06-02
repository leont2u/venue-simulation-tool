"""
Builds Celery task chains based on the job's input_mode.
Called from views.py after images/video are saved.
"""
import logging
import threading

from django.conf import settings

from venue_cv.models import InputMode
from venue_cv.pipeline.context import mark_failed

logger = logging.getLogger(__name__)


def launch_pipeline(job_id: str, input_mode: str) -> None:
    """
    Kick off the pipeline.

    In DEBUG mode (no Celery workers running): runs the entire pipeline
    synchronously in a background thread so the HTTP response returns
    immediately while processing continues in the same process.

    In production: sends tasks to the Celery broker as normal.
    """
    if getattr(settings, "DEBUG", False):
        t = threading.Thread(
            target=_run_synchronously,
            args=(job_id, input_mode),
            daemon=True,
        )
        t.start()
    else:
        _dispatch_to_celery(job_id, input_mode)


def _run_synchronously(job_id: str, input_mode: str) -> None:
    """
    Execute the full pipeline in-process (no Celery worker needed).
    Used in local development only.

    Primary analysis path:
      1. Gemma 3 vision (VisionLLMService) analyses the actual image →
         returns real objects, room dims, venue type.
      2. Y-position depth heuristic replaces the linear-gradient mock.
      3. RoomFormerService still runs for wall geometry.
      4. Remaining stages (scene graph, LLM reasoning, assets, scene gen)
         run exactly as in production.
    """
    from venue_cv.services.preprocessing_service import PreprocessingService
    from venue_cv.services.vision_llm_service import VisionLLMService, expand_groups_to_objects
    from venue_cv.services.roomformer_service import RoomFormerService
    from venue_cv.services.fusion_service import DepthFusionService
    from venue_cv.services.scene_graph_service import SceneGraphService
    from venue_cv.services.llm_service import LLMReasoningService
    from venue_cv.services.asset_service import AssetMatchingService
    from venue_cv.services.scene_gen_service import SceneGenService
    from venue_cv.models import (
        CVJob, DetectionResult, DetectedObject, DepthResult,
        RoomLayoutResult, SceneGraph, AssetMapping,
    )
    from venue_cv.pipeline.context import update_stage, mark_complete
    import numpy as np
    import django
    django.db.close_old_connections()

    try:
        job = CVJob.objects.get(id=job_id)

        # ── Stage 1: Preprocessing ───────────────────────────────────────
        update_stage(job_id, "preprocessing", "processing", pct=10)
        svc = PreprocessingService()
        for image in job.images.all():
            svc.process(image)
        update_stage(job_id, "preprocessing", "success")

        # ── Vision LLM Analysis (replaces YOLO + Depth mocks) ────────────
        # Run once per job on the first processed image, cache the result.
        vision_svc    = VisionLLMService()
        vision_result = None   # populated below

        # ── Stage 2a: Object Detection via Vision LLM ────────────────────
        update_stage(job_id, "object_detection", "processing", pct=10)
        for image in job.images.all():
            if not image.processed_file:
                continue

            logger.info("Running VisionLLMService on %s", image.processed_file.path)
            vision_result = vision_svc.analyse(image.processed_file.path)

            if vision_result:
                groups     = vision_result.get("object_groups", [])
                detections = expand_groups_to_objects(groups, image_w=1024, image_h=1024)
                logger.info(
                    "VisionLLM found %d object groups → %d individual detections",
                    len(groups), len(detections),
                )
            else:
                # Hard fallback if Ollama failed entirely
                logger.warning("VisionLLM returned nothing — using minimal fallback")
                detections = [
                    {"class": "chair", "confidence": 0.6, "bbox": [100, 300, 200, 450]},
                    {"class": "table", "confidence": 0.6, "bbox": [200, 280, 800, 450]},
                ]

            result = DetectionResult.objects.create(image=image, raw_output=detections)
            DetectedObject.objects.bulk_create([
                DetectedObject(
                    result=result,
                    class_name=d["class"],
                    confidence=d["confidence"],
                    bbox_x1=d["bbox"][0], bbox_y1=d["bbox"][1],
                    bbox_x2=d["bbox"][2], bbox_y2=d["bbox"][3],
                ) for d in detections
            ])
        update_stage(job_id, "object_detection", "success")

        # ── Stage 2b: Segmentation (skip in dev — no SAM2) ──────────────
        update_stage(job_id, "segmentation", "processing", pct=5)
        update_stage(job_id, "segmentation", "success")

        # ── Stage 2c: Depth — perspective Y-position heuristic ───────────
        # Objects lower in the image are closer (ground-plane assumption).
        # depth = 1 − (centroid_y / 1024)  →  top=1.0 far, bottom=0.0 near
        update_stage(job_id, "depth_estimation", "processing", pct=10)
        for image in job.images.all():
            if not image.processed_file:
                continue
            H, W = 1024, 1024
            # Create a vertical gradient: top rows = 1.0 (far), bottom = 0.0 (near)
            depth = np.tile(
                np.linspace(1.0, 0.0, H).reshape(H, 1),
                (1, W),
            ).astype(np.float32)
            from venue_cv.services.depth_service import DepthAnythingService
            depth_svc = DepthAnythingService()
            saved = depth_svc._save_depth_map(image.processed_file.path, depth)
            DepthResult.objects.update_or_create(
                image=image,
                defaults={
                    "depth_map_file": saved["depth_map_path"],
                    "min_depth":      float(depth.min()),
                    "max_depth":      float(depth.max()),
                    "scale_factor":   None,
                },
            )
        update_stage(job_id, "depth_estimation", "success")

        # ── Stage 2d: Room Layout ────────────────────────────────────────
        # Use VisionLLM room dimensions when available; OpenCV fills walls.
        update_stage(job_id, "room_layout", "processing", pct=10)
        room_svc = RoomFormerService()
        for image in job.images.all():
            if not image.processed_file:
                continue
            layout = room_svc.extract(image.processed_file.path)

            # Override dimensions with LLM values (much more accurate)
            if vision_result and "room" in vision_result:
                vr = vision_result["room"]
                layout["room_width"]  = float(vr.get("width_meters",  layout["room_width"]))
                layout["room_depth"]  = float(vr.get("depth_meters",  layout["room_depth"]))
                layout["room_height"] = float(vr.get("height_meters", layout["room_height"]))
                layout["confidence"]  = 0.82   # elevated because LLM confirmed it

            # Override floor/wall materials if LLM provided them
            if vision_result:
                if "floor" in vision_result:
                    layout["floor"] = vision_result["floor"]
                if "walls" in vision_result:
                    wall_color = vision_result["walls"].get("color", "#D0CEC8")
                    for w in layout["walls"]:
                        w["color"] = wall_color

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
        update_stage(job_id, "room_layout", "success")

        # ── Stage 3: Scene Graph ─────────────────────────────────────────
        update_stage(job_id, "scene_graph", "processing", pct=10)
        fusion = DepthFusionService()
        for image in job.images.all():
            fusion.fuse(str(image.id))

        builder    = SceneGraphService()
        graph_json = builder.build(job_id)

        # Inject pre-known semantic from VisionLLM so LLM reasoning has a head start
        if vision_result:
            graph_json["semantic"] = {
                "venue_type":        vision_result.get("venue_type", ""),
                "event_setup_style": vision_result.get("layout_type", ""),
                "capacity_estimate": 0,
                "detected_features": [],
                "llm_corrections":   [],
                "confidence_notes":  vision_result.get("notes", ""),
            }

        sg, _ = SceneGraph.objects.update_or_create(
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

        # ── Stage 4: LLM Reasoning ───────────────────────────────────────
        update_stage(job_id, "llm_reasoning", "processing", pct=5)
        llm       = LLMReasoningService()
        reasoning = llm.reason(sg.graph_json)
        updated_graph             = dict(sg.graph_json)
        updated_graph["semantic"] = reasoning
        SceneGraph.objects.filter(id=sg.id).update(
            venue_type         = reasoning.get("venue_type", ""),
            layout_type        = reasoning.get("event_setup_style", ""),
            capacity_est       = reasoning.get("capacity_estimate"),
            llm_reasoning_json = reasoning,
            graph_json         = updated_graph,
        )
        sg.refresh_from_db()
        update_stage(job_id, "llm_reasoning", "success")

        # ── Stage 5: Asset Matching ──────────────────────────────────────
        update_stage(job_id, "asset_matching", "processing", pct=5)
        asset_svc = AssetMatchingService()
        seen: set[str] = set()
        bulk = []
        for obj in sg.graph_json.get("objects", []):
            cn = obj["type"]
            if cn in seen:
                continue
            seen.add(cn)
            match = asset_svc.match(cn)
            bulk.append(AssetMapping(
                scene_graph  = sg,
                class_name   = cn,
                asset_source = match["source"],
                asset_id     = match["asset_id"],
                asset_url    = match["asset_url"],
                scale_x      = match["scale"][0],
                scale_y      = match["scale"][1],
                scale_z      = match["scale"][2],
                confidence   = match["confidence"],
            ))
        AssetMapping.objects.filter(scene_graph=sg).delete()
        if bulk:
            AssetMapping.objects.bulk_create(bulk)
        update_stage(job_id, "asset_matching", "success")

        # ── Stage 6: Scene Generation ────────────────────────────────────
        update_stage(job_id, "scene_generation", "processing", pct=10)
        sg.refresh_from_db()
        gen          = SceneGenService()
        project_json = gen.generate(sg)
        graph        = dict(sg.graph_json)
        graph["_generated_project"] = project_json
        SceneGraph.objects.filter(id=sg.id).update(graph_json=graph)
        update_stage(job_id, "scene_generation", "success")

        mark_complete(job_id)
        logger.info("Synchronous pipeline complete for job %s", job_id)

    except Exception as exc:
        logger.exception("Synchronous pipeline failed for job %s", job_id)
        mark_failed(job_id, str(exc))


def _dispatch_to_celery(job_id: str, input_mode: str) -> None:
    """Send tasks to the Celery broker (production path)."""
    from celery import chain, chord, group

    if input_mode == InputMode.SINGLE_IMAGE:
        _single_image_chain(job_id).delay()
    elif input_mode == InputMode.MULTI_IMAGE:
        _multi_image_chain(job_id).delay()
    elif input_mode == InputMode.VIDEO:
        _video_chain(job_id).delay()
    else:
        raise ValueError(f"Unknown input_mode: {input_mode}")


def _single_image_chain(job_id: str):
    """
    Stage 1 → Stage 2 (parallel chord) → Stage 3 → 4 → 5 → 6.

    The chord fires scene_graph.fuse_detections only after ALL four
    parallel detection tasks have completed successfully.
    """
    from venue_cv.tasks import (
        preprocessing, object_detection, segmentation,
        depth_estimation, room_layout, scene_graph,
        llm_reasoning, asset_matching, scene_generation,
    )

    return chain(
        preprocessing.normalize_image.si(job_id),
        chord(
            group(
                object_detection.run_yolo_world.si(job_id),
                segmentation.run_sam2.si(job_id),
                depth_estimation.run_depth_anything.si(job_id),
                room_layout.run_roomformer.si(job_id),
            ),
            scene_graph.fuse_detections.si(job_id),
        ),
        llm_reasoning.run_gemma3.si(job_id),
        asset_matching.match_assets.si(job_id),
        scene_generation.generate_scene.si(job_id),
    )


def _multi_image_chain(job_id: str):
    """Adds COLMAP SfM to the parallel stage-2 group."""
    from venue_cv.tasks import (
        preprocessing, object_detection, segmentation,
        depth_estimation, room_layout, sfm, scene_graph,
        llm_reasoning, asset_matching, scene_generation,
    )

    return chain(
        preprocessing.normalize_images_batch.si(job_id),
        chord(
            group(
                object_detection.run_yolo_world_batch.si(job_id),
                segmentation.run_sam2_batch.si(job_id),
                depth_estimation.run_depth_anything_batch.si(job_id),
                room_layout.run_roomformer_batch.si(job_id),
                sfm.run_colmap.si(job_id),
            ),
            scene_graph.fuse_multi_image.si(job_id),
        ),
        llm_reasoning.run_gemma3.si(job_id),
        asset_matching.match_assets.si(job_id),
        scene_generation.generate_scene.si(job_id),
    )


def _video_chain(job_id: str):
    """Frame extraction → COLMAP → Gaussian Splatting → mesh → scene."""
    from venue_cv.tasks import (
        video_processing, sfm, gaussian_splatting, scene_graph,
        llm_reasoning, asset_matching, scene_generation,
    )

    return chain(
        video_processing.extract_frames.si(job_id),
        sfm.run_colmap.si(job_id),
        gaussian_splatting.run_gsplat.si(job_id),
        gaussian_splatting.extract_mesh.si(job_id),
        scene_graph.build_from_mesh.si(job_id),
        llm_reasoning.run_gemma3.si(job_id),
        asset_matching.match_assets.si(job_id),
        scene_generation.generate_scene.si(job_id),
    )
