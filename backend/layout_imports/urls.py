from django.urls import path

from .views import (
    DrawioImportView,
    FloorplanImportView,
    FloorplanLayoutAnalysisView,
    FloorplanLayoutOptimizeView,
    FloorplanStructuralLayoutView,
    FloorplanTableLayoutView,
)


urlpatterns = [
    path("drawio/", DrawioImportView.as_view(), name="import-drawio"),
    path("floorplan/", FloorplanImportView.as_view(), name="import-floorplan"),
    path(
        "floorplan/structural-layout/",
        FloorplanStructuralLayoutView.as_view(),
        name="floorplan-structural-layout",
    ),
    path(
        "floorplan/layout-analysis/",
        FloorplanLayoutAnalysisView.as_view(),
        name="floorplan-layout-analysis",
    ),
    path(
        "floorplan/table-layout/",
        FloorplanTableLayoutView.as_view(),
        name="floorplan-table-layout",
    ),
    path(
        "floorplan/layout-optimize/",
        FloorplanLayoutOptimizeView.as_view(),
        name="floorplan-layout-optimize",
    ),
]
