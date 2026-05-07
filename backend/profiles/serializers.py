from rest_framework import serializers
from .models import UserProfile, SPECIALIZATION_CHOICES


class ProfileSerializer(serializers.ModelSerializer):
    displayName     = serializers.CharField(source="display_name", required=False, allow_blank=True)
    avatarUrl       = serializers.URLField(source="avatar_url",    required=False, allow_blank=True)
    isVerified      = serializers.BooleanField(source="is_verified", read_only=True)
    layoutCount     = serializers.SerializerMethodField()
    totalForks      = serializers.SerializerMethodField()
    totalLikes      = serializers.SerializerMethodField()

    class Meta:
        model  = UserProfile
        fields = [
            "id", "handle", "displayName", "bio", "avatarUrl",
            "location", "website", "specializations", "isVerified",
            "layoutCount", "totalForks", "totalLikes", "created_at",
        ]
        read_only_fields = ["id", "isVerified", "created_at"]

    def get_layoutCount(self, obj):
        from community.models import PublishedLayout
        return PublishedLayout.objects.filter(
            publisher=obj.user,
            moderation_status=PublishedLayout.MODERATION_APPROVED,
        ).count()

    def get_totalForks(self, obj):
        from community.models import PublishedLayout
        from django.db.models import Sum
        result = PublishedLayout.objects.filter(
            publisher=obj.user,
            moderation_status=PublishedLayout.MODERATION_APPROVED,
        ).aggregate(total=Sum("fork_count"))
        return result["total"] or 0

    def get_totalLikes(self, obj):
        from community.models import PublishedLayout
        from django.db.models import Sum
        result = PublishedLayout.objects.filter(
            publisher=obj.user,
            moderation_status=PublishedLayout.MODERATION_APPROVED,
        ).aggregate(total=Sum("like_count"))
        return result["total"] or 0


class ProfileUpdateSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", required=False, allow_blank=True, max_length=80)
    avatarUrl   = serializers.URLField(source="avatar_url",    required=False, allow_blank=True)

    class Meta:
        model  = UserProfile
        fields = ["handle", "displayName", "bio", "avatarUrl", "location", "website", "specializations"]

    def validate_handle(self, value):
        import re
        if not re.match(r"^[a-z0-9_-]{2,40}$", value):
            raise serializers.ValidationError("Handle must be 2–40 lowercase letters, numbers, underscores, or hyphens.")
        qs = UserProfile.objects.filter(handle=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This handle is already taken.")
        return value

    def validate_specializations(self, value):
        valid = {k for k, _ in SPECIALIZATION_CHOICES}
        invalid = [v for v in value if v not in valid]
        if invalid:
            raise serializers.ValidationError(f"Invalid specializations: {invalid}")
        return value
