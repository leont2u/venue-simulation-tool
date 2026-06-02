from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from community.models import PublishedLayout

User = get_user_model()


class PlatformStatsView(APIView):
    """
    Public platform stats shown on the landing page.
    Cached values are fine here — this endpoint is read-only and called infrequently.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        approved = PublishedLayout.objects.filter(moderation_status=PublishedLayout.MODERATION_APPROVED)

        layout_count  = approved.count()
        planner_count = (
            User.objects
            .filter(published_layouts__moderation_status=PublishedLayout.MODERATION_APPROVED)
            .distinct()
            .count()
        )
        fork_count = approved.aggregate(total=Sum("fork_count"))["total"] or 0

        return Response({
            "layoutCount":  layout_count,
            "plannerCount": planner_count,
            "forkCount":    fork_count,
        })
