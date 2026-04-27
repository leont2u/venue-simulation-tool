from django.urls import path

from .views import GenerateSceneView, LayoutFeedbackView


urlpatterns = [
    path("generate-scene/", GenerateSceneView.as_view(), name="ai-generate-scene"),
    path("feedback/", LayoutFeedbackView.as_view(), name="ai-layout-feedback"),
]
