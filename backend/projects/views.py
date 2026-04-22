from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, SharedProject
from .serializers import ProjectSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ProjectShareView(APIView):
    def post(self, request, id):
        project = Project.objects.filter(owner=request.user, id=id).first()
        if project is None:
            return Response("Project not found.", status=status.HTTP_404_NOT_FOUND)

        shared_project, _ = SharedProject.objects.get_or_create(project=project)
        return Response({"token": str(shared_project.token)}, status=status.HTTP_200_OK)


class SharedProjectDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        shared_project = (
            SharedProject.objects.select_related("project")
            .filter(token=token)
            .first()
        )
        if shared_project is None:
            return Response("Shared project not found.", status=status.HTTP_404_NOT_FOUND)

        serializer = ProjectSerializer(shared_project.project)
        return Response(serializer.data, status=status.HTTP_200_OK)
