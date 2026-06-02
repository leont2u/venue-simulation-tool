from django.contrib import admin
from venue_cv.models import (
    CVJob, VenueImage, VenueVideo, DetectionResult, DetectedObject,
    DepthResult, RoomLayoutResult, SfMResult, SceneGraph, AssetMapping,
)


@admin.register(CVJob)
class CVJobAdmin(admin.ModelAdmin):
    list_display  = ["id", "owner", "input_mode", "status", "current_stage", "created_at"]
    list_filter   = ["status", "input_mode", "current_stage"]
    readonly_fields = ["id", "created_at", "updated_at", "stage_progress"]
    search_fields = ["owner__email"]


@admin.register(VenueImage)
class VenueImageAdmin(admin.ModelAdmin):
    list_display = ["id", "job", "sequence", "width", "height", "created_at"]
    readonly_fields = ["id", "created_at"]


@admin.register(DetectionResult)
class DetectionResultAdmin(admin.ModelAdmin):
    list_display = ["id", "image", "created_at"]


@admin.register(DetectedObject)
class DetectedObjectAdmin(admin.ModelAdmin):
    list_display  = ["id", "class_name", "confidence", "world_x", "world_z"]
    list_filter   = ["class_name"]
    search_fields = ["class_name"]


@admin.register(SceneGraph)
class SceneGraphAdmin(admin.ModelAdmin):
    list_display  = ["id", "job", "venue_type", "layout_type", "capacity_est", "confidence", "created_at"]
    list_filter   = ["venue_type", "layout_type"]
    readonly_fields = ["id", "created_at", "updated_at"]


admin.site.register(VenueVideo)
admin.site.register(DepthResult)
admin.site.register(RoomLayoutResult)
admin.site.register(SfMResult)
admin.site.register(AssetMapping)
