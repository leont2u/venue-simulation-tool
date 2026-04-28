from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, SharedProject, SharedProjectComment
from .serializers import ProjectSerializer, SharedProjectCommentSerializer


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


class SharedProjectCommentListView(APIView):
    permission_classes = [AllowAny]

    def get_shared_project(self, token):
        return (
            SharedProject.objects.select_related("project", "project__owner")
            .filter(token=token)
            .first()
        )

    def get(self, request, token):
        shared_project = self.get_shared_project(token)
        if shared_project is None:
            return Response("Shared project not found.", status=status.HTTP_404_NOT_FOUND)

        comments = (
            shared_project.comments.filter(parent__isnull=True)
            .prefetch_related("replies")
            .order_by("created_at")
        )
        serializer = SharedProjectCommentSerializer(comments, many=True)
        return Response(
            {
                "comments": serializer.data,
                "canReplyAsAdmin": request.user.is_authenticated
                and shared_project.project.owner_id == request.user.id,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, token):
        shared_project = self.get_shared_project(token)
        if shared_project is None:
            return Response("Shared project not found.", status=status.HTTP_404_NOT_FOUND)

        author_name = str(request.data.get("author_name", "")).strip()
        body = str(request.data.get("body", "")).strip()
        if not author_name:
            return Response({"author_name": "Name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not body:
            return Response({"body": "Comment is required."}, status=status.HTTP_400_BAD_REQUEST)

        comment = SharedProjectComment.objects.create(
            shared_project=shared_project,
            author_name=author_name[:120],
            body=body,
        )
        serializer = SharedProjectCommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SharedProjectReplyCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token, comment_id):
        shared_project = (
            SharedProject.objects.select_related("project", "project__owner")
            .filter(token=token)
            .first()
        )
        if shared_project is None:
            return Response("Shared project not found.", status=status.HTTP_404_NOT_FOUND)

        if (
            not request.user.is_authenticated
            or shared_project.project.owner_id != request.user.id
        ):
            return Response("Only the project admin can reply.", status=status.HTTP_403_FORBIDDEN)

        parent = shared_project.comments.filter(id=comment_id, parent__isnull=True).first()
        if parent is None:
            return Response("Comment not found.", status=status.HTTP_404_NOT_FOUND)

        body = str(request.data.get("body", "")).strip()
        if not body:
            return Response({"body": "Reply is required."}, status=status.HTTP_400_BAD_REQUEST)

        author_name = (
            request.user.get_full_name()
            or request.user.get_username()
            or request.user.email
            or "Admin"
        )
        reply = SharedProjectComment.objects.create(
            shared_project=shared_project,
            parent=parent,
            author_name=author_name[:120],
            body=body,
            is_admin_reply=True,
        )
        serializer = SharedProjectCommentSerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
