from rest_framework import serializers

from .models import Project, SharedProjectComment


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    createdAt = serializers.DateTimeField(source="created_at", required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", required=False)
    measurements = serializers.JSONField(required=False)
    connections = serializers.JSONField(required=False)
    sceneSettings = serializers.JSONField(source="scene_settings", required=False)
    architecture = serializers.JSONField(required=False)

    # Phase 1: community fields (camelCase for frontend consistency)
    visibility = serializers.CharField(required=False)
    eventType = serializers.CharField(source="event_type", required=False, allow_null=True)
    tags = serializers.JSONField(required=False)
    thumbnailUrl = serializers.URLField(source="thumbnail_url", required=False, allow_null=True)
    forkedFromId = serializers.UUIDField(source="forked_from_id", read_only=True, allow_null=True)
    forkDepth = serializers.IntegerField(source="fork_depth", read_only=True)
    attribution = serializers.SerializerMethodField()
    publishState = serializers.SerializerMethodField()
    publishedListing = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "createdAt",
            "updatedAt",
            "room",
            "items",
            "connections",
            "measurements",
            "sceneSettings",
            "architecture",
            # community fields
            "visibility",
            "eventType",
            "tags",
            "thumbnailUrl",
            "forkedFromId",
            "forkDepth",
            "attribution",
            "publishState",
            "publishedListing",
        ]

    def get_attribution(self, obj):
        if not obj.forked_from_id and not obj.attribution_source_title:
            return None
        return {
            "sourceId":      str(obj.forked_from_id) if obj.forked_from_id else None,
            "sourceTitle":   obj.attribution_source_title,
            "sourceCreator": obj.attribution_source_creator,
        }

    def get_publishState(self, obj):
        from community.services.publishing import get_publish_state
        try:
            return get_publish_state(obj)
        except Exception:
            return "DRAFT_PRIVATE"

    def get_publishedListing(self, obj):
        try:
            listing = obj.published_listing
        except Exception:
            return None
        from community.serializers.publishing import PublishedListingSerializer
        return PublishedListingSerializer(listing).data

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.setdefault("measurements", [])
        validated_data.setdefault("connections", [])
        validated_data.setdefault("scene_settings", {})
        validated_data.setdefault("architecture", {})
        validated_data.setdefault("tags", [])
        return Project.objects.create(owner=request.user, **validated_data)

    def update(self, instance, validated_data):
        updatable = [
            "name",
            "room",
            "items",
            "connections",
            "measurements",
            "scene_settings",
            "architecture",
            "created_at",
            "updated_at",
            "visibility",
            "event_type",
            "tags",
            "thumbnail_url",
        ]
        for field in updatable:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        instance.save()
        return instance


class SharedProjectReplySerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isAdminReply = serializers.BooleanField(source="is_admin_reply", read_only=True)

    class Meta:
        model = SharedProjectComment
        fields = ["id", "author_name", "body", "isAdminReply", "createdAt"]


class SharedProjectCommentSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isAdminReply = serializers.BooleanField(source="is_admin_reply", read_only=True)
    replies = SharedProjectReplySerializer(many=True, read_only=True)

    class Meta:
        model = SharedProjectComment
        fields = ["id", "author_name", "body", "isAdminReply", "createdAt", "replies"]
