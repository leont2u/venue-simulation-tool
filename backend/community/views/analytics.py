from django.db.models import Sum, F
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from community.models import PublishedLayout


class CreatorAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        layouts = (
            PublishedLayout.objects
            .filter(publisher=request.user)
            .order_by("-published_at")
        )

        totals = layouts.aggregate(
            total_views=Sum("view_count"),
            total_unique_views=Sum("unique_view_count"),
            total_forks=Sum("fork_count"),
            total_saves=Sum("save_count"),
            total_likes=Sum("like_count"),
        )

        per_layout = []
        for l in layouts:
            per_layout.append({
                "id":            str(l.id),
                "projectId":     str(l.project_id),
                "title":         l.title,
                "eventType":     l.event_type,
                "moderationStatus": l.moderation_status,
                "publishedAt":   l.published_at,
                "views":         l.view_count,
                "uniqueViews":   l.unique_view_count,
                "forks":         l.fork_count,
                "saves":         l.save_count,
                "likes":         l.like_count,
                "trendingScore": float(l.trending_score or 0),
            })

        return Response({
            "totals": {
                "views":       totals["total_views"]        or 0,
                "uniqueViews": totals["total_unique_views"] or 0,
                "forks":       totals["total_forks"]        or 0,
                "saves":       totals["total_saves"]        or 0,
                "likes":       totals["total_likes"]        or 0,
                "layouts":     layouts.count(),
                "approvedLayouts": layouts.filter(moderation_status=PublishedLayout.MODERATION_APPROVED).count(),
            },
            "layouts": per_layout,
        })
