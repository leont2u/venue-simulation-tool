from enum import Enum

# Objects YOLO World will be prompted to detect in venue images
VENUE_DETECTION_CLASSES = [
    "chair",
    "table",
    "sofa",
    "stage",
    "podium",
    "door",
    "window",
    "curtain",
    "chandelier",
    "lighting fixture",
    "bar counter",
    "dance floor",
    "projection screen",
    "speaker",
    "column",
    "plant",
    "piano",
    "fireplace",
    "balcony railing",
    "staircase",
]

# Physical height defaults (meters) used when depth estimate is unreliable
CLASS_HEIGHT_DEFAULTS: dict[str, float] = {
    "chair":            0.90,
    "table":            0.75,
    "sofa":             0.85,
    "stage":            0.50,
    "podium":           1.10,
    "chandelier":       0.60,
    "curtain":          2.80,
    "door":             2.10,
    "window":           1.20,
    "lighting fixture": 0.30,
    "bar counter":      1.05,
    "dance floor":      0.02,
    "projection screen":1.80,
    "speaker":          0.45,
    "column":           3.00,
    "plant":            1.20,
    "piano":            1.00,
    "fireplace":        1.20,
}

# Fraction of pipeline stages for progress reporting
STAGE_WEIGHTS: dict[str, int] = {
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

# Video frame extraction rate
VIDEO_EXTRACT_FPS = 2

# Minimum confidence to keep a detection
YOLO_CONFIDENCE_THRESHOLD = 0.30

# NMS IoU threshold
NMS_IOU_THRESHOLD = 0.50

# DBSCAN clustering for furniture grouping
CLUSTER_EPS_METERS  = 2.0
CLUSTER_MIN_SAMPLES = 2

# Target resolution for processed images fed to ML models
PROCESSED_IMAGE_SIZE = 1024

# Fallback room dimensions if RoomFormer fails
FALLBACK_ROOM_WIDTH  = 10.0
FALLBACK_ROOM_DEPTH  = 8.0
FALLBACK_ROOM_HEIGHT = 3.0
