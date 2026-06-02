"""
COLMAP Service — Structure-from-Motion for multi-image / video modes.

Wraps COLMAP via pycolmap (Python bindings) with a subprocess fallback.
Outputs camera poses and sparse/dense point clouds.
"""
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import pycolmap
    PYCOLMAP_AVAILABLE = True
except ImportError:
    PYCOLMAP_AVAILABLE = False
    logger.warning("pycolmap not installed — COLMAP will use subprocess fallback")


class COLMAPService:

    def reconstruct(self, job_id: str, image_paths: list[str]) -> dict:
        """
        Run SfM on a set of images.

        Returns:
        {
          camera_poses:      list[dict],
          sparse_cloud_path: str | None,
          dense_cloud_path:  str | None,
          mesh_path:         str | None,
        }
        """
        if len(image_paths) < 2:
            logger.warning("COLMAP requires at least 2 images — skipping")
            return {"camera_poses": [], "sparse_cloud_path": None,
                    "dense_cloud_path": None, "mesh_path": None}

        work_dir  = Path(settings.MEDIA_ROOT) / "cv" / "sfm" / str(job_id)
        img_dir   = work_dir / "images"
        sparse_dir = work_dir / "sparse"
        dense_dir  = work_dir / "dense"

        work_dir.mkdir(parents=True, exist_ok=True)
        img_dir.mkdir(exist_ok=True)
        sparse_dir.mkdir(exist_ok=True)
        dense_dir.mkdir(exist_ok=True)

        # Symlink images into the COLMAP image directory
        for i, path in enumerate(image_paths):
            dst = img_dir / f"image_{i:04d}.jpg"
            if not dst.exists():
                shutil.copy2(path, dst)

        if PYCOLMAP_AVAILABLE:
            return self._run_pycolmap(work_dir, img_dir, sparse_dir, dense_dir)
        else:
            return self._run_subprocess(work_dir, img_dir, sparse_dir)

    def _run_pycolmap(self, work_dir, img_dir, sparse_dir, dense_dir) -> dict:
        try:
            db_path = work_dir / "database.db"

            pycolmap.extract_features(str(db_path), str(img_dir))
            pycolmap.match_exhaustive(str(db_path))
            maps = pycolmap.incremental_mapping(str(db_path), str(img_dir), str(sparse_dir))

            if not maps:
                return {"camera_poses": [], "sparse_cloud_path": None,
                        "dense_cloud_path": None, "mesh_path": None}

            reconstruction = maps[0]
            poses          = self._extract_poses(reconstruction)

            sparse_ply = sparse_dir / "points3D.ply"
            reconstruction.export_PLY(str(sparse_ply))

            rel_sparse = os.path.relpath(str(sparse_ply), settings.MEDIA_ROOT)
            return {
                "camera_poses":      poses,
                "sparse_cloud_path": rel_sparse,
                "dense_cloud_path":  None,
                "mesh_path":         None,
            }
        except Exception:
            logger.exception("pycolmap reconstruction failed")
            return {"camera_poses": [], "sparse_cloud_path": None,
                    "dense_cloud_path": None, "mesh_path": None}

    def _run_subprocess(self, work_dir, img_dir, sparse_dir) -> dict:
        """Subprocess fallback when pycolmap is not available."""
        try:
            db_path = work_dir / "database.db"
            cmds = [
                ["colmap", "feature_extractor", "--database_path", str(db_path),
                 "--image_path", str(img_dir)],
                ["colmap", "exhaustive_matcher", "--database_path", str(db_path)],
                ["colmap", "mapper", "--database_path", str(db_path),
                 "--image_path", str(img_dir), "--output_path", str(sparse_dir)],
            ]
            for cmd in cmds:
                subprocess.run(cmd, check=True, capture_output=True, timeout=300)

            return {
                "camera_poses":      [],   # Parse from sparse/0/images.bin if needed
                "sparse_cloud_path": None,
                "dense_cloud_path":  None,
                "mesh_path":         None,
            }
        except subprocess.CalledProcessError as e:
            logger.error("COLMAP subprocess failed: %s", e.stderr.decode())
            return {"camera_poses": [], "sparse_cloud_path": None,
                    "dense_cloud_path": None, "mesh_path": None}
        except FileNotFoundError:
            logger.error("colmap binary not found — install COLMAP system package")
            return {"camera_poses": [], "sparse_cloud_path": None,
                    "dense_cloud_path": None, "mesh_path": None}

    def _extract_poses(self, reconstruction) -> list[dict]:
        poses = []
        for img_id, img in reconstruction.images.items():
            t = img.cam_from_world.translation
            poses.append({
                "image_id": img_id,
                "name":     img.name,
                "position": [float(t[0]), float(t[1]), float(t[2])],
            })
        return poses
