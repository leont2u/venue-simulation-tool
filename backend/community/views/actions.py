from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from community.models import LayoutSave, LayoutLike, PublishedLayout
from community.services.forking import fork_layout


class ForkLayoutView(APIView):
    """
    POST /api/community/layouts/{project_id}/fork/
    Creates a fully independent copy of a public layout in the requester's workspace.
    Returns the new project id so the frontend can navigate to the editor immediately.
    """
    def post(self, request, project_id):
        try:
            forked = fork_layout(str(project_id), request.user)
        except Project.DoesNotExist:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response(str(exc), status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"id": str(forked.id), "name": forked.name},
            status=status.HTTP_201_CREATED,
        )


class SaveLayoutView(APIView):
    """
    POST   → bookmark a public layout into the user's inspiration library.
    DELETE → remove bookmark.
    """
    def _get_public_project(self, project_id):
        return (
            Project.objects
            .filter(id=project_id, visibility="PUBLIC", deleted_at__isnull=True)
            .first()
        )

    def post(self, request, project_id):
        project = self._get_public_project(project_id)
        if not project:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        _, created = LayoutSave.objects.get_or_create(user=request.user, project=project)
        if created:
            PublishedLayout.objects.filter(project=project).update(
                save_count=__import__("django.db.models", fromlist=["F"]).F("save_count") + 1
            )
        return Response({"saved": True}, status=status.HTTP_200_OK)

    def delete(self, request, project_id):
        project = self._get_public_project(project_id)
        if not project:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        deleted, _ = LayoutSave.objects.filter(user=request.user, project=project).delete()
        if deleted:
            from django.db.models import F
            PublishedLayout.objects.filter(project=project).update(
                save_count=F("save_count") - 1
            )
        return Response({"saved": False}, status=status.HTTP_200_OK)


class LikeLayoutView(APIView):
    """
    POST   → like a published listing.
    DELETE → unlike.
    """
    def _get_listing(self, project_id):
        return (
            PublishedLayout.objects
            .filter(
                project_id=project_id,
                moderation_status=PublishedLayout.MODERATION_APPROVED,
            )
            .first()
        )

    def post(self, request, project_id):
        listing = self._get_listing(project_id)
        if not listing:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        _, created = LayoutLike.objects.get_or_create(user=request.user, published_layout=listing)
        if created:
            from django.db.models import F
            listing.__class__.objects.filter(pk=listing.pk).update(like_count=F("like_count") + 1)
        return Response({"liked": True}, status=status.HTTP_200_OK)

    def delete(self, request, project_id):
        listing = self._get_listing(project_id)
        if not listing:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        deleted, _ = LayoutLike.objects.filter(user=request.user, published_layout=listing).delete()
        if deleted:
            from django.db.models import F
            listing.__class__.objects.filter(pk=listing.pk).update(like_count=F("like_count") - 1)
        return Response({"liked": False}, status=status.HTTP_200_OK)
