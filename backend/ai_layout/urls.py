from django.urls import path

from .views import GenerateSceneView


urlpatterns = [
    path("generate-scene/", GenerateSceneView.as_view(), name="ai-generate-scene"),
]
