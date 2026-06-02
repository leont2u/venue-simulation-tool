import base64
import os
import uuid

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from projects.models import Project


class ProjectThumbnailView(APIView):
    """
    POST { data_url, project_id }
    Saves the base64 JPEG, updates project.thumbnail_url, returns { url }.
    Using project_id as filename means re-saves overwrite the previous thumbnail.
    """

    def post(self, request):
        data_url   = str(request.data.get("data_url", ""))
        project_id = request.data.get("project_id")

        if not data_url.startswith("data:image/"):
            return Response({"error": "Invalid image data."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _, encoded = data_url.split(",", 1)
            image_bytes = base64.b64decode(encoded)
        except Exception:
            return Response({"error": "Could not decode image."}, status=status.HTTP_400_BAD_REQUEST)

        safe_id   = str(project_id) if project_id else str(uuid.uuid4())
        filename  = f"thumbnails/{safe_id}.jpg"
        abs_path  = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        with open(abs_path, "wb") as fh:
            fh.write(image_bytes)

        url = request.build_absolute_uri(f"{settings.MEDIA_URL}{filename}")

        if project_id:
            Project.objects.filter(id=project_id, owner=request.user).update(
                thumbnail_url=url
            )

        return Response({"url": url})
