"""
Scene Graph Service — fuses all stage-2 outputs into a structured SceneGraph JSON.

For single-image:  uses depth + bbox + room layout
For multi-image:   also incorporates COLMAP camera poses for better scale
For video/mesh:    builds from the extracted mesh geometry
"""
import logging
import uuid

import numpy as np

from venue_cv.models import (
    CVJob, DetectedObject, RoomLayoutResult, SfMResult,
)
from venue_cv.pipeline.constants import (
    NMS_IOU_THRESHOLD,
    CLUSTER_EPS_METERS,
    CLUSTER_MIN_SAMPLES,
    FALLBACK_ROOM_WIDTH,
    FALLBACK_ROOM_DEPTH,
    FALLBACK_ROOM_HEIGHT,
)

logger = logging.getLogger(__name__)

try:
    from sklearn.cluster import DBSCAN
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


FURNITURE_CLASSES = {"chair", "table", "sofa", "podium", "stage", "bar counter", "piano"}
LIGHTING_CLASSES  = {"chandelier", "lighting fixture"}
OVERHEAD_CLASSES  = {"chandelier", "projection screen"}


class SceneGraphService:

    def build(self, job_id: str, use_sfm: bool = False) -> dict:
        job  = CVJob.objects.prefetch_related("images").get(id=job_id)
        image = job.images.first()
        if not image:
            raise ValueError(f"No images for job {job_id}")

        try:
            room_layout = RoomLayoutResult.objects.get(image=image)
        except RoomLayoutResult.DoesNotExist:
            room_layout = None

        all_objects = list(
            DetectedObject.objects.filter(result__image=image)
            .select_related("result")
        )
        filtered    = self._nms_filter(all_objects)
        clusters    = self._cluster_furniture(filtered)

        room_w = (room_layout.room_width  if room_layout else None) or FALLBACK_ROOM_WIDTH
        room_d = (room_layout.room_depth  if room_layout else None) or FALLBACK_ROOM_DEPTH
        room_h = (room_layout.room_height if room_layout else None) or FALLBACK_ROOM_HEIGHT

        confidence = self._compute_confidence(filtered, room_layout)

        # SfM scale correction (multi-image only)
        if use_sfm:
            try:
                sfm     = SfMResult.objects.get(job=job)
                scale   = self._estimate_sfm_scale(sfm, room_w, room_d)
                room_w *= scale
                room_d *= scale
            except SfMResult.DoesNotExist:
                pass

        obj_cluster_map = {}
        for cluster in clusters:
            for oid in cluster["object_ids"]:
                obj_cluster_map[oid] = cluster["id"]

        objects_out = [
            self._serialize_object(o, obj_cluster_map)
            for o in filtered
        ]

        return {
            "version":    1,
            "job_id":     str(job_id),
            "input_mode": job.input_mode,
            "confidence": round(confidence, 3),
            "room": {
                "width":    round(room_w, 2),
                "depth":    round(room_d, 2),
                "height":   round(room_h, 2),
                "shape":    "rectangular",
                "area_sqm": round(room_w * room_d, 1),
            },
            "architecture": {
                "walls":   room_layout.walls   if room_layout else [],
                "floor":   room_layout.floor   if room_layout else {"material": "carpet", "color": "#8B7355"},
                "ceiling": room_layout.ceiling if room_layout else {"height": room_h, "material": "painted_plaster"},
                "windows": room_layout.windows if room_layout else [],
                "doors":   room_layout.doors   if room_layout else [],
                "columns": [],
            },
            "objects":  objects_out,
            "clusters": clusters,
            "lighting": self._extract_lighting(filtered),
            "semantic": {},  # filled by LLM reasoning task
        }

    def build_from_mesh(self, job_id: str, mesh_path: str | None) -> dict:
        """Video mode: build a basic scene graph from mesh bounding box."""
        job  = CVJob.objects.get(id=job_id)
        dims = self._estimate_room_from_mesh(mesh_path)
        return {
            "version":    1,
            "job_id":     str(job_id),
            "input_mode": job.input_mode,
            "confidence": 0.75 if mesh_path else 0.30,
            "room":       dims,
            "architecture": {"walls": [], "floor": {}, "ceiling": {}, "windows": [], "doors": [], "columns": []},
            "objects":    [],
            "clusters":   [],
            "lighting":   [],
            "semantic":   {},
        }

    # ── Internal helpers ────────────────────────────────────────────────────

    def _nms_filter(self, objects: list) -> list:
        if len(objects) < 2:
            return objects
        boxes  = np.array([[o.bbox_x1, o.bbox_y1, o.bbox_x2, o.bbox_y2] for o in objects])
        scores = np.array([o.confidence for o in objects])
        order  = scores.argsort()[::-1]
        keep   = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            if order.size == 1:
                break
            ious = self._iou_batch(boxes[i], boxes[order[1:]])
            # Keep objects of *different* class even if IoU is high
            order_rest = order[1:]
            same_class = np.array([objects[j].class_name == objects[i].class_name for j in order_rest])
            order = order_rest[~(same_class & (ious > NMS_IOU_THRESHOLD))]
        return [objects[i] for i in keep]

    def _iou_batch(self, box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
        x1  = np.maximum(box[0], boxes[:, 0])
        y1  = np.maximum(box[1], boxes[:, 1])
        x2  = np.minimum(box[2], boxes[:, 2])
        y2  = np.minimum(box[3], boxes[:, 3])
        inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        a_box   = (box[2] - box[0]) * (box[3] - box[1])
        a_boxes = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        return inter / (a_box + a_boxes - inter + 1e-6)

    def _cluster_furniture(self, objects: list) -> list[dict]:
        furniture = [o for o in objects if o.class_name in FURNITURE_CLASSES
                     and o.world_x is not None and o.world_z is not None]
        if len(furniture) < CLUSTER_MIN_SAMPLES or not SKLEARN_AVAILABLE:
            return []

        coords = np.array([[o.world_x, o.world_z] for o in furniture])
        labels = DBSCAN(eps=CLUSTER_EPS_METERS, min_samples=CLUSTER_MIN_SAMPLES).fit_predict(coords)

        clusters = []
        for label in sorted(set(labels)):
            if label == -1:
                continue
            mask    = labels == label
            members = [furniture[i] for i, m in enumerate(mask) if m]
            pos     = coords[mask]
            cx, cz  = float(pos[:, 0].mean()), float(pos[:, 1].mean())
            arr     = self._infer_arrangement(members, cx, cz)
            cap     = sum(1 for o in members if o.class_name == "chair")
            clusters.append({
                "id":          f"cluster_{label}",
                "arrangement": arr,
                "object_ids":  [str(o.id) for o in members],
                "centroid_x":  round(cx, 2),
                "centroid_z":  round(cz, 2),
                "bounding_box": {
                    "x1": round(float(pos[:, 0].min()), 2),
                    "z1": round(float(pos[:, 1].min()), 2),
                    "x2": round(float(pos[:, 0].max()), 2),
                    "z2": round(float(pos[:, 1].max()), 2),
                },
                "capacity": cap,
            })
        return clusters

    def _infer_arrangement(self, objects: list, cx: float, cz: float) -> str:
        chairs = [o for o in objects if o.class_name == "chair"]
        if len(chairs) < 3:
            return "scattered"
        positions = np.array([[c.world_x - cx, c.world_z - cz] for c in chairs])
        angles    = np.arctan2(positions[:, 1], positions[:, 0])
        # Coverage: fraction of the full circle occupied by chairs
        coverage  = (angles.max() - angles.min()) / (2 * np.pi)
        if coverage > 0.80:
            return "boardroom"
        if coverage > 0.55:
            return "u_shape"
        # Classroom: multiple distinct rows
        z_positions = positions[:, 1]
        row_count   = len(set(np.round(z_positions, 0)))
        if row_count >= 3:
            return "classroom"
        if len(chairs) > 20:
            return "banquet"
        return "scattered"

    def _extract_lighting(self, objects: list) -> list[dict]:
        lighting = []
        for o in objects:
            if o.class_name in LIGHTING_CLASSES and o.world_x is not None:
                lighting.append({
                    "type":      o.class_name,
                    "object_id": str(o.id),
                    "world_x":   o.world_x,
                    "world_y":   o.world_y or 3.0,
                    "world_z":   o.world_z,
                    "intensity": 0.8,
                })
        if not lighting:
            lighting.append({"type": "ambient", "intensity": 0.6})
        return lighting

    def _compute_confidence(self, objects: list, room_layout) -> float:
        score = 0.30
        if objects:
            avg_conf = np.mean([o.confidence for o in objects])
            score   += avg_conf * 0.40
        if room_layout and room_layout.confidence:
            score += room_layout.confidence * 0.30
        return min(score, 0.99)

    def _serialize_object(self, o, cluster_map: dict) -> dict:
        return {
            "id":         str(o.id),
            "type":       o.class_name,
            "confidence": round(o.confidence, 3),
            "world_x":    round(o.world_x or 0, 3),
            "world_y":    round(o.world_y or 0, 3),
            "world_z":    round(o.world_z or 0, 3),
            "rotation_y": round(o.rotation_y or 0, 3),
            "est_width":  round(o.est_width  or 1.0, 3),
            "est_height": round(o.est_height or 1.0, 3),
            "est_depth":  round(o.est_depth  or 1.0, 3),
            "cluster_id": cluster_map.get(str(o.id)),
        }

    def _estimate_sfm_scale(self, sfm, room_w: float, room_d: float) -> float:
        """Very rough scale correction from camera baseline vs room size."""
        poses = sfm.camera_poses
        if len(poses) < 2:
            return 1.0
        positions = np.array([p.get("position", [0, 0, 0]) for p in poses])
        baseline  = float(np.linalg.norm(positions.max(axis=0) - positions.min(axis=0)))
        if baseline < 0.01:
            return 1.0
        expected_diagonal = np.sqrt(room_w**2 + room_d**2)
        return min(max(expected_diagonal / baseline, 0.5), 5.0)

    def _estimate_room_from_mesh(self, mesh_path: str | None) -> dict:
        if not mesh_path:
            return {"width": FALLBACK_ROOM_WIDTH, "depth": FALLBACK_ROOM_DEPTH,
                    "height": FALLBACK_ROOM_HEIGHT, "shape": "rectangular",
                    "area_sqm": FALLBACK_ROOM_WIDTH * FALLBACK_ROOM_DEPTH}
        try:
            import trimesh
            mesh  = trimesh.load(mesh_path)
            bb    = mesh.bounding_box.extents
            return {"width": round(float(bb[0]), 2), "depth": round(float(bb[2]), 2),
                    "height": round(float(bb[1]), 2), "shape": "rectangular",
                    "area_sqm": round(float(bb[0] * bb[2]), 1)}
        except Exception:
            return {"width": FALLBACK_ROOM_WIDTH, "depth": FALLBACK_ROOM_DEPTH,
                    "height": FALLBACK_ROOM_HEIGHT, "shape": "rectangular",
                    "area_sqm": FALLBACK_ROOM_WIDTH * FALLBACK_ROOM_DEPTH}
