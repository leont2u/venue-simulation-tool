from django.db.models import Q
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from community.models import PublishedLayout
from community.serializers.discovery import (
    PublishedLayoutListSerializer,
    PublishedLayoutDetailSerializer,
)


class DiscoveryPagination(PageNumberPagination):
    page_size             = 24
    page_size_query_param = "page_size"
    max_page_size         = 48

    def get_paginated_response(self, data):
        from rest_framework.response import Response
        return Response({
            "count":    self.page.paginator.count,
            "next":     self.get_next_link(),
            "previous": self.get_previous_link(),
            "results":  data,
        })


class LayoutDiscoveryView(ListAPIView):
    """
    Public feed of approved published layouts.
    Supports filtering by event_type, tags, free-text search, and sort order.
    No auth required. Returns paginated results (24 per page).
    """
    permission_classes = [AllowAny]
    serializer_class   = PublishedLayoutListSerializer
    pagination_class   = DiscoveryPagination

    def get_queryset(self):
        qs = (
            PublishedLayout.objects
            .filter(moderation_status=PublishedLayout.MODERATION_APPROVED)
            .select_related("project", "publisher")
        )

        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        # tags is a JSON array column — filter by containment
        tags = self.request.query_params.getlist("tags")
        for tag in tags:
            qs = qs.filter(tags__contains=[tag])

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q) |
                Q(tagline__icontains=q)
            )

        sort_map = {
            "trending":    "-trending_score",
            "newest":      "-published_at",
            "most_forked": "-fork_count",
            "most_saved":  "-save_count",
        }
        sort = self.request.query_params.get("sort", "trending")
        qs = qs.order_by(sort_map.get(sort, "-trending_score"))

        return qs


class LayoutDiscoveryDetailView(RetrieveAPIView):
    """
    Public detail of a single published layout.
    Returns the published_snapshot — the scene state at time of publish,
    not the owner's live working copy. This is intentional.
    """
    permission_classes = [AllowAny]
    serializer_class   = PublishedLayoutDetailSerializer
    lookup_field       = "id"

    def get_queryset(self):
        return (
            PublishedLayout.objects
            .filter(moderation_status=PublishedLayout.MODERATION_APPROVED)
            .select_related("project", "project__forked_from", "publisher")
        )
