from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from community.models import PublishedLayout
from community.serializers.discovery import PublishedLayoutListSerializer
from .models import UserProfile
from .serializers import ProfileSerializer, ProfileUpdateSerializer


class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_or_create_profile(request.user)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        profile    = _get_or_create_profile(request.user)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(profile).data)


class PlannerProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, handle):
        try:
            profile = UserProfile.objects.select_related("user").get(handle=handle)
        except UserProfile.DoesNotExist:
            return Response({"detail": "Planner not found."}, status=status.HTTP_404_NOT_FOUND)

        layouts = (
            PublishedLayout.objects
            .filter(publisher=profile.user, moderation_status=PublishedLayout.MODERATION_APPROVED)
            .select_related("project")
            .order_by("-published_at")[:12]
        )

        return Response({
            "profile": ProfileSerializer(profile).data,
            "layouts": PublishedLayoutListSerializer(layouts, many=True).data,
        })


def _get_or_create_profile(user) -> UserProfile:
    from profiles.models import _slugify_email, _unique_handle
    profile, created = UserProfile.objects.get_or_create(user=user)
    if created:
        base   = _slugify_email(user.email)
        handle = _unique_handle(base)
        profile.handle = handle
        profile.save(update_fields=["handle"])
    return profile
