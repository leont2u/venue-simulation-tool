from django.urls import path

from .views import (
    ProjectDetailView,
    ProjectListCreateView,
    ProjectShareView,
    SharedProjectDetailView,
)


urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project-list-create"),
    path("<uuid:id>/", ProjectDetailView.as_view(), name="project-detail"),
    path("<uuid:id>/share/", ProjectShareView.as_view(), name="project-share"),
    path("shared/<uuid:token>/", SharedProjectDetailView.as_view(), name="shared-project-detail"),
]
