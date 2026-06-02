"""
Depth Fusion Service — lifts 2D bounding-box detections to 3D world coordinates.

For each detected object:
  1. Sample the depth map at the object centroid (bilinear interpolation)
  2. Normalise relative depth to metric depth using room layout scale
  3. Map pixel x → world x using the room width
  4. Map normalised depth → world z using the room depth
  5. Use class-default height where direct estimation is unreliable
"""
import logging

import numpy as np

from venue_cv.models import DetectedObject, DepthResult, RoomLayoutResult
from venue_cv.pipeline.constants import (
    CLASS_HEIGHT_DEFAULTS,
    FALLBACK_ROOM_WIDTH,
    FALLBACK_ROOM_DEPTH,
    PROCESSED_IMAGE_SIZE,
)

logger = logging.getLogger(__name__)


class DepthFusionService:

    def fuse(self, image_id: str) -> None:
        """
        Compute world_x/y/z and estimated dimensions for all DetectedObjects
        belonging to the given VenueImage.
        """
        try:
            depth_result = DepthResult.objects.get(image_id=image_id)
            room_layout  = RoomLayoutResult.objects.get(image_id=image_id)
        except (DepthResult.DoesNotExist, RoomLayoutResult.DoesNotExist):
            logger.warning("Cannot fuse image %s — depth or room layout missing", image_id)
            return

        depth_map = np.load(depth_result.depth_map_file.path)   # H × W float32
        H, W      = depth_map.shape
        d_min, d_max = depth_map.min(), depth_map.max()
        d_range   = max(d_max - d_min, 1e-6)

        room_w = room_layout.room_width  or FALLBACK_ROOM_WIDTH
        room_d = room_layout.room_depth  or FALLBACK_ROOM_DEPTH

        objects  = DetectedObject.objects.filter(result__image_id=image_id)
        updates  = []

        for obj in objects:
            # Centroid in pixels
            cx = (obj.bbox_x1 + obj.bbox_x2) / 2
            cy = (obj.bbox_y1 + obj.bbox_y2) / 2

            # Sample depth (clamp to valid range)
            px = int(np.clip(cx / PROCESSED_IMAGE_SIZE * W, 0, W - 1))
            py = int(np.clip(cy / PROCESSED_IMAGE_SIZE * H, 0, H - 1))
            raw_depth = float(depth_map[py, px])

            # Normalised depth → metric (0 = near, room_d = far)
            norm_depth   = (raw_depth - d_min) / d_range
            metric_depth = norm_depth * room_d

            # Pixel → world (centered coordinate system)
            obj.world_x = round((cx / PROCESSED_IMAGE_SIZE - 0.5) * room_w, 3)
            obj.world_y = 0.0
            obj.world_z = round(metric_depth - room_d / 2, 3)

            # Footprint size from bbox fraction of image width
            bbox_w_pct  = (obj.bbox_x2 - obj.bbox_x1) / PROCESSED_IMAGE_SIZE
            est_w       = round(bbox_w_pct * room_w, 3)
            est_h       = CLASS_HEIGHT_DEFAULTS.get(obj.class_name, 1.0)
            est_d       = est_w  # assume roughly square footprint

            # Sanity clamp: objects can't be larger than the room
            obj.est_width  = min(est_w, room_w * 0.5)
            obj.est_height = est_h
            obj.est_depth  = min(est_d, room_d * 0.5)

            updates.append(obj)

        if updates:
            DetectedObject.objects.bulk_update(
                updates,
                ["world_x", "world_y", "world_z", "est_width", "est_height", "est_depth"],
            )
            logger.info("Fused %d objects for image %s", len(updates), image_id)
