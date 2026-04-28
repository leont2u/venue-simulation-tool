from django.urls import path

from .views import (
    ProjectDetailView,
    ProjectListCreateView,
    ProjectShareView,
    SharedProjectDetailView,
    SharedProjectCommentListView,
    SharedProjectReplyCreateView,
)


urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project-list-create"),
    path("<uuid:id>/", ProjectDetailView.as_view(), name="project-detail"),
    path("<uuid:id>/share/", ProjectShareView.as_view(), name="project-share"),
    path("shared/<uuid:token>/", SharedProjectDetailView.as_view(), name="shared-project-detail"),
    path("shared/<uuid:token>/comments/", SharedProjectCommentListView.as_view(), name="shared-project-comments"),
    path(
        "shared/<uuid:token>/comments/<int:comment_id>/replies/",
        SharedProjectReplyCreateView.as_view(),
        name="shared-project-comment-replies",
    ),
]
