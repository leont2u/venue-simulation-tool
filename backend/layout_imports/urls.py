from django.urls import path

from .views import DrawioImportView


urlpatterns = [
    path("drawio/", DrawioImportView.as_view(), name="import-drawio"),
]
