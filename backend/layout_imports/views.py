from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.serializers import ProjectSerializer

from .detection import (
    analyze_layout_from_walls,
    extract_structural_layout,
    extract_table_layout,
    optimize_event_layout,
)
from .preprocessing import preprocess_floorplan
from .renderer import floorplan_file_to_project
from .services import drawio_file_to_project, html_canvas_to_project, is_html_canvas_floorplan


class DrawioImportView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            content = uploaded_file.read().decode("utf-8")
            if is_html_canvas_floorplan(content):
                project = html_canvas_to_project(
                    content,
                    uploaded_file.name,
                    request.data.get("name"),
                )
            else:
                project = drawio_file_to_project(
                    content,
                    uploaded_file.name,
                    request.data.get("name"),
                )
            serializer = ProjectSerializer(
                data=project,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)


class FloorplanImportView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            px_to_meter = request.data.get("pxToMeter")
            project = floorplan_file_to_project(
                uploaded_file.read(),
                uploaded_file.name,
                request.data.get("name"),
                float(px_to_meter) if px_to_meter else None,
            )
            project.pop("floorPlanUnderstanding", None)
            serializer = ProjectSerializer(
                data=project,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)


class FloorplanStructuralLayoutView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = preprocess_floorplan(uploaded_file.read(), uploaded_file.name)
            return Response(extract_structural_layout(plan), status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)


class FloorplanLayoutAnalysisView(APIView):
    def post(self, request):
        try:
            walls = request.data.get("walls")
            uploaded_file = request.FILES.get("file")

            if walls is None and uploaded_file is not None:
                plan = preprocess_floorplan(uploaded_file.read(), uploaded_file.name)
                walls = extract_structural_layout(plan)["walls"]

            if not isinstance(walls, list):
                return Response("Walls must be provided as a list.", status=status.HTTP_400_BAD_REQUEST)

            return Response(analyze_layout_from_walls(walls), status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)


class FloorplanTableLayoutView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = preprocess_floorplan(uploaded_file.read(), uploaded_file.name)
            return Response(extract_table_layout(plan), status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)


class FloorplanLayoutOptimizeView(APIView):
    def post(self, request):
        try:
            payload = {
                "tables": request.data.get("tables"),
                "table_groups": request.data.get("table_groups"),
                "walls": request.data.get("walls"),
                "zones": request.data.get("zones"),
            }
            uploaded_file = request.FILES.get("file")

            if uploaded_file is not None:
                plan = preprocess_floorplan(uploaded_file.read(), uploaded_file.name)
                if not isinstance(payload["tables"], list):
                    table_layout = extract_table_layout(plan)
                    payload["tables"] = table_layout["tables"]
                    payload["table_groups"] = table_layout["table_groups"]
                if not isinstance(payload["walls"], list):
                    payload["walls"] = extract_structural_layout(plan)["walls"]
                if not isinstance(payload["zones"], list):
                    payload["zones"] = analyze_layout_from_walls(payload["walls"])["zones"]

            if not isinstance(payload["tables"], list):
                return Response("Tables must be provided as a list.", status=status.HTTP_400_BAD_REQUEST)

            for optional_key in ("table_groups", "walls", "zones"):
                if payload[optional_key] is None:
                    payload[optional_key] = []
                if not isinstance(payload[optional_key], list):
                    return Response(f"{optional_key} must be provided as a list.", status=status.HTTP_400_BAD_REQUEST)

            return Response(optimize_event_layout(payload), status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_400_BAD_REQUEST)
