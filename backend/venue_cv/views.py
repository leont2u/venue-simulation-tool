import logging
from django.utils import timezone

from django.db import transaction
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from venue_cv.models import (
    CVJob, InputMode, JobStatus, VenueImage, VenueVideo,
    DetectionResult, DepthResult, RoomLayoutResult, SceneGraph, AssetMapping,
)
from venue_cv.pipeline.orchestrator import launch_pipeline
from venue_cv.serializers import (
    CVJobDetailSerializer, CVJobStatusSerializer,
    DetectionResultSerializer, DepthResultSerializer,
    RoomLayoutResultSerializer, SceneGraphSerializer,
    AssetMappingUpdateSerializer,
)

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"}
MAX_IMAGE_SIZE_MB   = 20
MAX_VIDEO_SIZE_MB   = 500


# ── Upload Views ──────────────────────────────────────────────────────────────

class SingleImageUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        content_type = image_file.content_type or ""
        if content_type not in ALLOWED_IMAGE_TYPES:
            return Response(
                {"error": f"Unsupported file type '{content_type}'. Use JPEG, PNG, or HEIC."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        if image_file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
            return Response(
                {"error": f"Image exceeds {MAX_IMAGE_SIZE_MB}MB limit."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        with transaction.atomic():
            job = CVJob.objects.create(
                owner=request.user,
                input_mode=InputMode.SINGLE_IMAGE,
                status=JobStatus.PENDING,
            )
            VenueImage.objects.create(job=job, sequence=0, original_file=image_file)

        try:
            launch_pipeline(str(job.id), InputMode.SINGLE_IMAGE)
        except Exception:
            logger.exception("Failed to launch pipeline for job %s", job.id)

        return Response(
            {"job_id": str(job.id), "status": "pending", "input_mode": "single_image"},
            status=status.HTTP_202_ACCEPTED,
        )


class MultiImageUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_files = request.FILES.getlist("images")
        if not image_files:
            return Response({"error": "No images provided."}, status=status.HTTP_400_BAD_REQUEST)
        if len(image_files) > 20:
            return Response({"error": "Maximum 20 images per upload."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            job = CVJob.objects.create(
                owner=request.user,
                input_mode=InputMode.MULTI_IMAGE,
                status=JobStatus.PENDING,
            )
            for i, f in enumerate(image_files):
                VenueImage.objects.create(job=job, sequence=i, original_file=f)

        try:
            launch_pipeline(str(job.id), InputMode.MULTI_IMAGE)
        except Exception:
            logger.exception("Failed to launch pipeline for job %s", job.id)

        return Response(
            {"job_id": str(job.id), "status": "pending", "input_mode": "multi_image",
             "image_count": len(image_files)},
            status=status.HTTP_202_ACCEPTED,
        )


class VideoUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        video_file = request.FILES.get("video")
        if not video_file:
            return Response({"error": "No video file provided."}, status=status.HTTP_400_BAD_REQUEST)

        content_type = video_file.content_type or ""
        if content_type not in ALLOWED_VIDEO_TYPES:
            return Response(
                {"error": f"Unsupported video type '{content_type}'. Use MP4, MOV, or WebM."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        if video_file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024:
            return Response(
                {"error": f"Video exceeds {MAX_VIDEO_SIZE_MB}MB limit."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        with transaction.atomic():
            job = CVJob.objects.create(
                owner=request.user,
                input_mode=InputMode.VIDEO,
                status=JobStatus.PENDING,
            )
            VenueVideo.objects.create(job=job, original_file=video_file)

        try:
            launch_pipeline(str(job.id), InputMode.VIDEO)
        except Exception:
            logger.exception("Failed to launch video pipeline for job %s", job.id)

        return Response(
            {"job_id": str(job.id), "status": "pending", "input_mode": "video"},
            status=status.HTTP_202_ACCEPTED,
        )


# ── Job Status & Control ──────────────────────────────────────────────────────

class CVJobDetailView(APIView):
    def get(self, request, job_id):
        job = self._get_job(request, job_id)
        if job is None:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CVJobDetailSerializer(job).data)

    def _get_job(self, request, job_id):
        try:
            return CVJob.objects.prefetch_related("images").get(id=job_id, owner=request.user)
        except CVJob.DoesNotExist:
            return None


class CVJobStatusView(APIView):
    def get(self, request, job_id):
        try:
            job = CVJob.objects.get(id=job_id, owner=request.user)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(CVJobStatusSerializer(job).data)


class CVJobCancelView(APIView):
    def post(self, request, job_id):
        try:
            job = CVJob.objects.get(id=job_id, owner=request.user)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        if job.status in (JobStatus.SUCCESS, JobStatus.FAILED):
            return Response({"error": "Job already finished."}, status=status.HTTP_400_BAD_REQUEST)

        job.status = JobStatus.FAILED
        job.error_message = "Cancelled by user."
        job.save(update_fields=["status", "error_message", "updated_at"])
        return Response({"status": "cancelled"})


# ── Stage Result Inspection ───────────────────────────────────────────────────

class DetectionResultView(APIView):
    def get(self, request, job_id):
        try:
            job   = CVJob.objects.get(id=job_id, owner=request.user)
            image = job.images.first()
            if not image or not hasattr(image, "detection"):
                return Response({"error": "Detection results not yet available."}, status=status.HTTP_404_NOT_FOUND)
            return Response(DetectionResultSerializer(image.detection).data)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)


class DepthResultView(APIView):
    def get(self, request, job_id):
        try:
            job   = CVJob.objects.get(id=job_id, owner=request.user)
            image = job.images.first()
            if not image:
                return Response({"error": "No images."}, status=status.HTTP_404_NOT_FOUND)
            depth = DepthResult.objects.filter(image=image).first()
            if not depth:
                return Response({"error": "Depth result not yet available."}, status=status.HTTP_404_NOT_FOUND)
            return Response(DepthResultSerializer(depth).data)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)


class RoomLayoutResultView(APIView):
    def get(self, request, job_id):
        try:
            job   = CVJob.objects.get(id=job_id, owner=request.user)
            image = job.images.first()
            if not image:
                return Response({"error": "No images."}, status=status.HTTP_404_NOT_FOUND)
            layout = RoomLayoutResult.objects.filter(image=image).first()
            if not layout:
                return Response({"error": "Room layout not yet available."}, status=status.HTTP_404_NOT_FOUND)
            return Response(RoomLayoutResultSerializer(layout).data)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)


class SceneGraphView(APIView):
    def get(self, request, job_id):
        try:
            job = CVJob.objects.get(id=job_id, owner=request.user)
            sg  = SceneGraph.objects.prefetch_related("asset_mappings").get(job=job)
            return Response({"scene_graph": SceneGraphSerializer(sg).data})
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        except SceneGraph.DoesNotExist:
            return Response({"error": "Scene graph not yet available."}, status=status.HTTP_404_NOT_FOUND)


# ── Scene Acceptance ──────────────────────────────────────────────────────────

class AcceptSceneView(APIView):
    """
    POST /api/cv/jobs/:id/accept/

    Creates a real Project from the generated scene graph, then links
    the CVJob to that project. Returns the new project_id for redirect
    to /editor/:project_id.
    """

    def post(self, request, job_id):
        try:
            job = CVJob.objects.get(id=job_id, owner=request.user)
        except CVJob.DoesNotExist:
            return Response({"error": "Job not found."}, status=status.HTTP_404_NOT_FOUND)

        if job.status != JobStatus.SUCCESS:
            return Response(
                {"error": "Pipeline has not completed successfully yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            sg = SceneGraph.objects.get(job=job)
        except SceneGraph.DoesNotExist:
            return Response({"error": "Scene graph not found."}, status=status.HTTP_404_NOT_FOUND)

        project_json = sg.graph_json.get("_generated_project")
        if not project_json:
            return Response(
                {"error": "Generated project JSON not available — re-run scene_generation task."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        now = timezone.now()
        with transaction.atomic():
            project = Project.objects.create(
                owner          = request.user,
                name           = project_json.get("name", "CV Generated Venue"),
                room           = project_json.get("room", {"width": 10, "depth": 8, "height": 3}),
                items          = project_json.get("items", []),
                connections    = project_json.get("connections", []),
                architecture   = project_json.get("architecture", {}),
                scene_settings = project_json.get("sceneSettings", {}),
                measurements   = project_json.get("measurements", []),
                created_at     = now,
                updated_at     = now,
            )
            # Link the job to the project for traceability
            CVJob.objects.filter(id=job_id).update(project=project)

        return Response(
            {"project_id": str(project.id)},
            status=status.HTTP_201_CREATED,
        )


# ── Asset Mapping Override ─────────────────────────────────────────────────────

class AssetMappingUpdateView(APIView):
    """
    PATCH /api/cv/jobs/:id/assets/:mapping_id/

    Allows the frontend preview to swap a detected object's assigned asset
    before the user accepts the scene.
    """

    def patch(self, request, job_id, mapping_id):
        try:
            job = CVJob.objects.get(id=job_id, owner=request.user)
            sg  = SceneGraph.objects.get(job=job)
            mapping = AssetMapping.objects.get(id=mapping_id, scene_graph=sg)
        except (CVJob.DoesNotExist, SceneGraph.DoesNotExist, AssetMapping.DoesNotExist):
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AssetMappingUpdateSerializer(mapping, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
