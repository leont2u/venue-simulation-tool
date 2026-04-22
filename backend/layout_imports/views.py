from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.serializers import ProjectSerializer

from .services import drawio_file_to_project


class DrawioImportView(APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response("File is required.", status=status.HTTP_400_BAD_REQUEST)

        try:
            content = uploaded_file.read().decode("utf-8")
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

