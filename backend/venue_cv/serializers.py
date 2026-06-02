from rest_framework import serializers

from venue_cv.models import (
    CVJob, VenueImage, DetectedObject, DetectionResult,
    DepthResult, RoomLayoutResult, SceneGraph, AssetMapping,
)


class VenueImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VenueImage
        fields = ["id", "sequence", "original_file", "processed_file", "width", "height", "created_at"]
        read_only_fields = fields


class StageProgressSerializer(serializers.Serializer):
    """Normalises the stage_progress JSON dict for the status endpoint."""
    status = serializers.CharField()
    pct    = serializers.IntegerField(default=0)
    duration_ms = serializers.IntegerField(required=False, allow_null=True)
    error  = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class CVJobStatusSerializer(serializers.ModelSerializer):
    overall_progress = serializers.SerializerMethodField()
    stages           = serializers.SerializerMethodField()

    class Meta:
        model  = CVJob
        fields = [
            "id", "input_mode", "status", "current_stage",
            "overall_progress", "stages", "error_message",
            "created_at", "updated_at",
        ]

    def get_overall_progress(self, obj: CVJob) -> int:
        return obj.get_overall_progress()

    def get_stages(self, obj: CVJob) -> dict:
        all_stages = [
            "preprocessing", "object_detection", "segmentation",
            "depth_estimation", "room_layout", "sfm", "gaussian_splat",
            "scene_graph", "llm_reasoning", "asset_matching", "scene_generation",
        ]
        out = {}
        for stage in all_stages:
            info = obj.stage_progress.get(stage, {})
            out[stage] = {
                "status": info.get("status", "queued"),
                "pct":    info.get("pct", 0),
            }
            if "error" in info:
                out[stage]["error"] = info["error"]
        return out


class CVJobDetailSerializer(serializers.ModelSerializer):
    images           = VenueImageSerializer(many=True, read_only=True)
    overall_progress = serializers.SerializerMethodField()

    class Meta:
        model  = CVJob
        fields = [
            "id", "input_mode", "status", "current_stage", "overall_progress",
            "stage_progress", "error_message", "images", "created_at", "updated_at",
        ]

    def get_overall_progress(self, obj: CVJob) -> int:
        return obj.get_overall_progress()


class DetectedObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DetectedObject
        fields = [
            "id", "class_name", "confidence",
            "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2",
            "world_x", "world_y", "world_z",
            "est_width", "est_height", "est_depth",
            "rotation_y", "mask_file",
        ]


class DetectionResultSerializer(serializers.ModelSerializer):
    detected_objects = DetectedObjectSerializer(many=True, read_only=True)

    class Meta:
        model  = DetectionResult
        fields = ["id", "image", "raw_output", "detected_objects", "created_at"]


class DepthResultSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DepthResult
        fields = ["id", "image", "depth_map_file", "min_depth", "max_depth", "scale_factor", "created_at"]


class RoomLayoutResultSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RoomLayoutResult
        fields = [
            "id", "image", "walls", "floor", "ceiling", "windows", "doors",
            "room_width", "room_depth", "room_height", "confidence", "created_at",
        ]


class AssetMappingSerializer(serializers.ModelSerializer):
    scale = serializers.SerializerMethodField()

    class Meta:
        model  = AssetMapping
        fields = ["id", "class_name", "asset_source", "asset_id", "asset_url", "scale", "confidence"]

    def get_scale(self, obj: AssetMapping) -> list[float]:
        return [obj.scale_x, obj.scale_y, obj.scale_z]


class AssetMappingUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AssetMapping
        fields = ["asset_source", "asset_id", "asset_url", "scale_x", "scale_y", "scale_z"]


class SceneGraphSerializer(serializers.ModelSerializer):
    asset_mappings = AssetMappingSerializer(many=True, read_only=True)

    class Meta:
        model  = SceneGraph
        fields = [
            "id", "version", "room_width", "room_depth", "room_height",
            "venue_type", "layout_type", "capacity_est",
            "graph_json", "llm_reasoning_json", "confidence",
            "asset_mappings", "created_at", "updated_at",
        ]
