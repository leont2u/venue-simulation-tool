from django.urls import path

from .views import DrawioImportView, FloorplanImportView


urlpatterns = [
    path("drawio/", DrawioImportView.as_view(), name="import-drawio"),
    path("floorplan/", FloorplanImportView.as_view(), name="import-floorplan"),
]
