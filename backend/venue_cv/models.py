import uuid
from django.conf import settings
from django.db import models


class InputMode(models.TextChoices):
    SINGLE_IMAGE = "single_image", "Single Image"
    MULTI_IMAGE  = "multi_image",  "Multiple Images"
    VIDEO        = "video",        "Walkthrough Video"


class PipelineStage(models.TextChoices):
    QUEUED            = "queued",            "Queued"
    PREPROCESSING     = "preprocessing",     "Preprocessing"
    OBJECT_DETECTION  = "object_detection",  "Object Detection"
    SEGMENTATION      = "segmentation",      "Segmentation"
    DEPTH_ESTIMATION  = "depth_estimation",  "Depth Estimation"
    ROOM_LAYOUT       = "room_layout",       "Room Layout"
    SFM               = "sfm",               "Structure from Motion"
    GAUSSIAN_SPLAT    = "gaussian_splat",    "Gaussian Splatting"
    SCENE_GRAPH       = "scene_graph",       "Scene Graph"
    LLM_REASONING     = "llm_reasoning",     "LLM Reasoning"
    ASSET_MATCHING    = "asset_matching",    "Asset Matching"
    SCENE_GENERATION  = "scene_generation",  "Scene Generation"
    COMPLETE          = "complete",          "Complete"
    FAILED            = "failed",            "Failed"


class JobStatus(models.TextChoices):
    PENDING    = "pending",    "Pending"
    PROCESSING = "processing", "Processing"
    SUCCESS    = "success",    "Success"
    FAILED     = "failed",     "Failed"
    RETRYING   = "retrying",   "Retrying"


# ── Core Job ──────────────────────────────────────────────────────────────────

class CVJob(models.Model):
    """Top-level processing job — one per upload session."""
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project       = models.ForeignKey(
        "projects.Project", on_delete=models.SET_NULL,
        related_name="cv_jobs", null=True, blank=True
    )
    owner         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="cv_jobs"
    )
    input_mode    = models.CharField(max_length=20, choices=InputMode.choices)
    status        = models.CharField(max_length=20, choices=JobStatus.choices, default=JobStatus.PENDING)
    current_stage = models.CharField(max_length=30, choices=PipelineStage.choices, default=PipelineStage.QUEUED)
    # { stage_name: { status, pct, started_at, finished_at, error } }
    stage_progress = models.JSONField(default=dict)
    error_message  = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [models.Index(fields=["owner", "status"])]

    def __str__(self):
        return f"CVJob({self.input_mode}, {self.status}) – {self.id}"

    def get_overall_progress(self) -> int:
        """Compute 0-100 percentage across all stages."""
        stage_weights = {
            "preprocessing":    5,
            "object_detection": 15,
            "segmentation":     15,
            "depth_estimation": 15,
            "room_layout":      15,
            "sfm":              10,
            "gaussian_splat":   5,
            "scene_graph":      8,
            "llm_reasoning":    7,
            "asset_matching":   3,
            "scene_generation": 2,
        }
        total_weight = sum(stage_weights.values())
        earned = 0
        for stage, weight in stage_weights.items():
            info = self.stage_progress.get(stage, {})
            pct  = info.get("pct", 0)
            if info.get("status") == "success":
                pct = 100
            earned += weight * pct / 100
        return int(earned / total_weight * 100)


# ── Input Media ───────────────────────────────────────────────────────────────

class VenueImage(models.Model):
    """One input image attached to a CVJob."""
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job            = models.ForeignKey(CVJob, on_delete=models.CASCADE, related_name="images")
    sequence       = models.PositiveSmallIntegerField(default=0)
    original_file  = models.FileField(upload_to="cv/originals/")
    processed_file = models.FileField(upload_to="cv/processed/", blank=True)
    width          = models.PositiveIntegerField(null=True, blank=True)
    height         = models.PositiveIntegerField(null=True, blank=True)
    exif_data      = models.JSONField(default=dict)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sequence"]


class VenueVideo(models.Model):
    """Video input for walkthrough mode."""
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job           = models.ForeignKey(CVJob, on_delete=models.CASCADE, related_name="videos")
    original_file = models.FileField(upload_to="cv/videos/")
    duration_sec  = models.FloatField(null=True, blank=True)
    fps           = models.FloatField(null=True, blank=True)
    frame_count   = models.PositiveIntegerField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)


# ── Stage Results ─────────────────────────────────────────────────────────────

class DetectionResult(models.Model):
    """YOLO World detections for one image."""
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image      = models.OneToOneField(VenueImage, on_delete=models.CASCADE, related_name="detection")
    raw_output = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class DetectedObject(models.Model):
    """Single detected object with bbox + 3D world position after fusion."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    result      = models.ForeignKey(DetectionResult, on_delete=models.CASCADE, related_name="detected_objects")
    class_name  = models.CharField(max_length=100)
    confidence  = models.FloatField()
    # Pixel bounding box
    bbox_x1     = models.FloatField()
    bbox_y1     = models.FloatField()
    bbox_x2     = models.FloatField()
    bbox_y2     = models.FloatField()
    # World coordinates (meters) — populated after depth fusion
    world_x     = models.FloatField(null=True, blank=True)
    world_y     = models.FloatField(null=True, blank=True)
    world_z     = models.FloatField(null=True, blank=True)
    est_width   = models.FloatField(null=True, blank=True)
    est_height  = models.FloatField(null=True, blank=True)
    est_depth   = models.FloatField(null=True, blank=True)
    rotation_y  = models.FloatField(default=0.0)
    mask_file   = models.FileField(upload_to="cv/masks/", blank=True)

    class Meta:
        indexes = [models.Index(fields=["result", "class_name"])]


class DepthResult(models.Model):
    """Depth Anything V2 output for one image."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image           = models.OneToOneField(VenueImage, on_delete=models.CASCADE, related_name="depth")
    depth_map_file  = models.FileField(upload_to="cv/depth/")
    min_depth       = models.FloatField(null=True, blank=True)
    max_depth       = models.FloatField(null=True, blank=True)
    scale_factor    = models.FloatField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)


class RoomLayoutResult(models.Model):
    """HorizonNet / RoomFormer structural output."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image       = models.OneToOneField(VenueImage, on_delete=models.CASCADE, related_name="room_layout")
    walls       = models.JSONField(default=list)
    floor       = models.JSONField(default=dict)
    ceiling     = models.JSONField(default=dict)
    windows     = models.JSONField(default=list)
    doors       = models.JSONField(default=list)
    room_width  = models.FloatField(null=True, blank=True)
    room_depth  = models.FloatField(null=True, blank=True)
    room_height = models.FloatField(null=True, blank=True)
    confidence  = models.FloatField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)


class SfMResult(models.Model):
    """COLMAP Structure-from-Motion output (multi-image / video modes)."""
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job              = models.OneToOneField(CVJob, on_delete=models.CASCADE, related_name="sfm")
    camera_poses     = models.JSONField(default=list)
    sparse_cloud_file= models.FileField(upload_to="cv/sfm/sparse/", blank=True)
    dense_cloud_file = models.FileField(upload_to="cv/sfm/dense/", blank=True)
    mesh_file        = models.FileField(upload_to="cv/sfm/mesh/", blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)


# ── Scene Graph (Central Artifact) ───────────────────────────────────────────

class SceneGraph(models.Model):
    """The structured 3D understanding produced by the full pipeline."""
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job          = models.OneToOneField(CVJob, on_delete=models.CASCADE, related_name="scene_graph")
    version      = models.PositiveSmallIntegerField(default=1)

    room_width   = models.FloatField(default=10.0)
    room_depth   = models.FloatField(default=8.0)
    room_height  = models.FloatField(default=3.0)

    venue_type   = models.CharField(max_length=60, blank=True)
    layout_type  = models.CharField(max_length=60, blank=True)
    capacity_est = models.PositiveIntegerField(null=True, blank=True)

    graph_json          = models.JSONField(default=dict)
    llm_reasoning_json  = models.JSONField(default=dict)

    confidence   = models.FloatField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SceneGraph({self.venue_type or 'unknown'}) – job {self.job_id}"


class AssetMapping(models.Model):
    """Maps a detected object class to a 3D asset for scene generation."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scene_graph     = models.ForeignKey(SceneGraph, on_delete=models.CASCADE, related_name="asset_mappings")
    detected_object = models.ForeignKey(DetectedObject, on_delete=models.SET_NULL, null=True, blank=True)
    class_name      = models.CharField(max_length=100)
    asset_source    = models.CharField(max_length=30)  # internal | poly-pizza | sketchfab | primitive
    asset_id        = models.CharField(max_length=255)
    asset_url       = models.CharField(max_length=500)
    scale_x         = models.FloatField(default=1.0)
    scale_y         = models.FloatField(default=1.0)
    scale_z         = models.FloatField(default=1.0)
    confidence      = models.FloatField(default=1.0)

    class Meta:
        indexes = [models.Index(fields=["scene_graph", "class_name"])]
