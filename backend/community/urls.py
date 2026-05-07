from django.urls import path

from community.views.discovery import LayoutDiscoveryView, LayoutDiscoveryDetailView
from community.views.publishing import LayoutPublishView
from community.views.actions import ForkLayoutView, SaveLayoutView, LikeLayoutView
from community.views.stats import PlatformStatsView
from community.views.analytics import CreatorAnalyticsView

urlpatterns = [
    # Discovery — public, no auth required
    path("discovery/layouts/",           LayoutDiscoveryView.as_view()),
    path("discovery/layouts/<uuid:id>/", LayoutDiscoveryDetailView.as_view()),
    path("stats/",                       PlatformStatsView.as_view()),

    # Creator analytics — authenticated
    path("analytics/creator/",           CreatorAnalyticsView.as_view()),

    # Publishing — owner only
    path("layouts/<uuid:project_id>/publish/", LayoutPublishView.as_view()),

    # Actions — authenticated users
    path("layouts/<uuid:project_id>/fork/",    ForkLayoutView.as_view()),
    path("layouts/<uuid:project_id>/save/",    SaveLayoutView.as_view()),
    path("layouts/<uuid:project_id>/like/",    LikeLayoutView.as_view()),
]
