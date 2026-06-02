"""
Gaussian Splatting Service.

Wraps gsplat (nerfstudio-based) for training a 3D Gaussian Splat from
COLMAP sparse reconstruction, then extracting a watertight mesh.

In development (no GPU / gsplat not installed), both steps are no-ops
that return mock paths so the rest of the pipeline can continue.
"""
import logging
import os
import subprocess
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import gsplat  # noqa: F401
    GSPLAT_AVAILABLE = True
except ImportError:
    GSPLAT_AVAILABLE = False
    logger.warning("gsplat not installed — Gaussian splatting will be skipped")


class GaussianSplattingService:

    def train(self, job_id: str, sfm_sparse_path: str) -> dict:
        """
        Train a 3D Gaussian splat from the COLMAP sparse point cloud.

        Returns: { splat_path: str (relative to MEDIA_ROOT) }
        """
        out_dir = Path(settings.MEDIA_ROOT) / "cv" / "gsplat" / str(job_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        splat_file = out_dir / "splat.ply"

        if not GSPLAT_AVAILABLE:
            logger.info("gsplat not available — creating mock splat file")
            splat_file.touch()
            return {"splat_path": os.path.relpath(str(splat_file), settings.MEDIA_ROOT)}

        try:
            subprocess.run(
                [
                    "python", "-m", "gsplat.train",
                    "--data_dir", str(Path(sfm_sparse_path).parent),
                    "--output_dir", str(out_dir),
                    "--max_steps", "7000",
                ],
                check=True,
                capture_output=True,
                timeout=3600,
            )
            return {"splat_path": os.path.relpath(str(splat_file), settings.MEDIA_ROOT)}
        except Exception:
            logger.exception("Gaussian splatting training failed")
            splat_file.touch()  # Create placeholder so pipeline can continue
            return {"splat_path": os.path.relpath(str(splat_file), settings.MEDIA_ROOT)}

    def extract_mesh(self, job_id: str, splat_path: str) -> dict:
        """
        Extract a watertight mesh from the trained splat.

        Returns: { mesh_path: str (relative to MEDIA_ROOT) }
        """
        out_dir   = Path(settings.MEDIA_ROOT) / "cv" / "gsplat" / str(job_id)
        mesh_file = out_dir / "mesh.obj"

        if not GSPLAT_AVAILABLE or not splat_path:
            mesh_file.touch()
            return {"mesh_path": os.path.relpath(str(mesh_file), settings.MEDIA_ROOT)}

        try:
            subprocess.run(
                [
                    "python", "-m", "gsplat.mesh_extraction",
                    "--splat", splat_path,
                    "--output", str(mesh_file),
                ],
                check=True,
                capture_output=True,
                timeout=600,
            )
        except Exception:
            logger.exception("Mesh extraction failed")
            mesh_file.touch()

        return {"mesh_path": os.path.relpath(str(mesh_file), settings.MEDIA_ROOT)}
