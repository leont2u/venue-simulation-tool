from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .feedback import store_layout_feedback
from .mapper import prompt_scene_plan_to_project
from .schemas import validate_prompt_layout_intent
from .services import generate_scene_with_ollama
from .validation import validate_generated_project


class GenerateSceneView(APIView):
    def post(self, request):
        prompt = str(request.data.get("prompt") or "").strip()
        if not prompt:
            return Response("Prompt is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_scene = generate_scene_with_ollama(prompt)
            validated_intent = validate_prompt_layout_intent(raw_scene, prompt)
            project = prompt_scene_plan_to_project(validated_intent)
            project = validate_generated_project(project, validated_intent)
            return Response(project, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LayoutFeedbackView(APIView):
    def post(self, request):
        correction = str(request.data.get("correction") or "").strip()
        prompt = str(request.data.get("prompt") or "").strip()
        context = request.data.get("context") if isinstance(request.data.get("context"), dict) else {}

        if not correction:
            return Response("Correction is required.", status=status.HTTP_400_BAD_REQUEST)

        feedback = store_layout_feedback(prompt, correction, context)
        return Response(feedback, status=status.HTTP_201_CREATED)
