// ── Upload & Job ─────────────────────────────────────────────────────────────

export type InputMode = "single_image" | "multi_image" | "video";

export type JobStatus = "pending" | "processing" | "success" | "failed" | "retrying";

export type PipelineStage =
  | "queued"
  | "preprocessing"
  | "object_detection"
  | "segmentation"
  | "depth_estimation"
  | "room_layout"
  | "sfm"
  | "gaussian_splat"
  | "scene_graph"
  | "llm_reasoning"
  | "asset_matching"
  | "scene_generation"
  | "complete"
  | "failed";

export interface StageInfo {
  status: "queued" | "processing" | "success" | "failed";
  pct: number;
  duration_ms?: number;
  error?: string;
}

export interface CVJobStatus {
  id: string;
  input_mode: InputMode;
  status: JobStatus;
  current_stage: PipelineStage;
  overall_progress: number; // 0–100
  stages: Record<string, StageInfo>;
  error_message: string;
  created_at: string;
  updated_at: string;
}

// ── Scene Graph ───────────────────────────────────────────────────────────────

export interface SceneRoom {
  width: number;
  depth: number;
  height: number;
  shape: "rectangular" | "l_shape" | "irregular";
  area_sqm: number;
}

export interface SceneWall {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height: number;
  thickness: number;
  surface?: string;
}

export interface SceneWindow {
  id: string;
  wall_id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  sill_height: number;
}

export interface SceneDoor {
  id: string;
  wall_id: string;
  x: number;
  z: number;
  width: number;
  height: number;
}

export interface SceneArchitecture {
  walls: SceneWall[];
  floor: { material: string; color: string };
  ceiling: { height: number; material: string };
  windows: SceneWindow[];
  doors: SceneDoor[];
  columns: Array<{
    id: string;
    x: number;
    z: number;
    radius: number;
    height: number;
  }>;
}

export interface DetectedSceneObject {
  id: string;
  type: string;
  subtype?: string;
  confidence: number;
  world_x: number;
  world_y: number;
  world_z: number;
  rotation_y: number;
  est_width: number;
  est_height: number;
  est_depth: number;
  cluster_id: string | null;
}

export interface ObjectCluster {
  id: string;
  arrangement:
    | "u_shape"
    | "classroom"
    | "banquet"
    | "theater"
    | "boardroom"
    | "scattered";
  object_ids: string[];
  centroid_x: number;
  centroid_z: number;
  bounding_box: { x1: number; z1: number; x2: number; z2: number };
  capacity: number;
}

export interface SceneLightSource {
  type: string;
  object_id?: string;
  world_x: number;
  world_y: number;
  world_z: number;
  intensity?: number;
}

export interface SceneGraphSemantic {
  venue_type: string;
  event_setup_style: string;
  capacity_estimate: number;
  detected_features: string[];
  llm_corrections: string[];
  confidence_notes: string;
}

export interface SceneGraph {
  version: number;
  job_id: string;
  input_mode: InputMode;
  confidence: number;
  room: SceneRoom;
  architecture: SceneArchitecture;
  objects: DetectedSceneObject[];
  clusters: ObjectCluster[];
  lighting: SceneLightSource[];
  semantic: SceneGraphSemantic;
}

// ── Asset Mapping ─────────────────────────────────────────────────────────────

export type AssetSource = "internal" | "poly-pizza" | "sketchfab" | "primitive";

export interface AssetMapping {
  id: string;
  class_name: string;
  asset_source: AssetSource;
  asset_id: string;
  asset_url: string;
  scale: [number, number, number];
  confidence: number;
}

// ── Full Scene Graph API response ─────────────────────────────────────────────

export interface SceneGraphResponse {
  id: string;
  version: number;
  room_width: number;
  room_depth: number;
  room_height: number;
  venue_type: string;
  layout_type: string;
  capacity_est: number | null;
  graph_json: SceneGraph;
  llm_reasoning_json: SceneGraphSemantic;
  confidence: number | null;
  asset_mappings: AssetMapping[];
  created_at: string;
  updated_at: string;
}

// ── Upload API ────────────────────────────────────────────────────────────────

export interface UploadResponse {
  job_id: string;
  status: "pending";
  input_mode: InputMode;
  image_count?: number;
}

// ── Accept API ────────────────────────────────────────────────────────────────

export interface AcceptResponse {
  project_id: string;
}
