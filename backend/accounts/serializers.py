from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data["email"].strip().lower()
        return User.objects.create_user(
            username=email,
            email=email,
            password=validated_data["password"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Invalid email or password.") from exc

        authenticated_user = authenticate(
            username=user.get_username(),
            password=password,
        )
        if authenticated_user is None:
            raise serializers.ValidationError("Invalid email or password.")

        refresh = RefreshToken.for_user(authenticated_user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "email": authenticated_user.email,
            },
        }


class UserSerializer(serializers.Serializer):
    email = serializers.EmailField()
