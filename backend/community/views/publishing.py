from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from community.models import PublishedLayout
from community.services.publishing import publish_layout, unpublish_layout
from community.serializers.publishing import PublishRequestSerializer, PublishedListingSerializer


class LayoutPublishView(APIView):
    """
    POST   → publish or re-publish a layout.
    DELETE → unpublish (layout reverts to PRIVATE; PublishedLayout row is soft-removed from feeds).
    """

    def _get_owned_project(self, request, project_id):
        return (
            Project.objects
            .filter(id=project_id, owner=request.user, deleted_at__isnull=True)
            .select_related("published_listing")
            .first()
        )

    def post(self, request, project_id):
        project = self._get_owned_project(request, project_id)
        if not project:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        serializer = PublishRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        published = publish_layout(project, request.user, serializer.validated_data)

        http_status = (
            status.HTTP_201_CREATED
            if not hasattr(project, "_published_listing_cache")
            else status.HTTP_200_OK
        )
        return Response(PublishedListingSerializer(published).data, status=http_status)

    def delete(self, request, project_id):
        project = self._get_owned_project(request, project_id)
        if not project:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        try:
            unpublish_layout(project, request.user)
        except PermissionError as exc:
            return Response(str(exc), status=status.HTTP_403_FORBIDDEN)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def get(self, request, project_id):
        """Return the published listing for the owner's own project."""
        project = self._get_owned_project(request, project_id)
        if not project:
            return Response("Layout not found.", status=status.HTTP_404_NOT_FOUND)

        try:
            listing = project.published_listing
        except PublishedLayout.DoesNotExist:
            return Response("Not published.", status=status.HTTP_404_NOT_FOUND)

        return Response(PublishedListingSerializer(listing).data)
