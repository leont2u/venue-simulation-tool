from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .utils import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    apply_auth_cookies,
    cookie_secure,
    clear_auth_cookies,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "registered"}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        response = Response({"user": data["user"]}, status=status.HTTP_200_OK)
        apply_auth_cookies(response, data["access"], data["refresh"])
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME) or request.data.get(
            "refresh"
        )
        if not refresh_token:
            return Response("Refresh token is required.", status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
        except Exception as exc:
            return Response(str(exc), status=status.HTTP_401_UNAUTHORIZED)

        response = Response({"detail": "refreshed"}, status=status.HTTP_200_OK)
        response.set_cookie(
            ACCESS_COOKIE_NAME,
            access_token,
            httponly=True,
            secure=cookie_secure(),
            samesite="Lax",
            max_age=60 * 30,
            path="/",
        )
        return response


class MeView(APIView):
    def get(self, request):
        user = request.user
        data = {"email": user.email}

        # Attach profile fields if the profiles app is installed
        try:
            from profiles.models import UserProfile, _slugify_email, _unique_handle
            profile, created = UserProfile.objects.get_or_create(user=user)
            if created:
                base   = _slugify_email(user.email)
                handle = _unique_handle(base)
                profile.handle = handle
                profile.save(update_fields=["handle"])
            data["handle"]      = profile.handle
            data["displayName"] = profile.display_name or user.email.split("@")[0]
            data["avatarUrl"]   = profile.avatar_url or ""
            data["isVerified"]  = profile.is_verified
        except Exception:
            pass

        # Unread notification count
        try:
            from notifications.models import Notification
            data["unreadNotifications"] = Notification.objects.filter(
                recipient=user, is_read=False
            ).count()
        except Exception:
            data["unreadNotifications"] = 0

        return Response({"user": data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    def post(self, request):
        response = Response({"detail": "logged out"}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)
        return response
