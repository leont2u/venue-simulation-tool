from rest_framework import serializers

from .models import Project, SharedProjectComment


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    createdAt = serializers.DateTimeField(source="created_at", required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", required=False)
    measurements = serializers.JSONField(required=False)
    connections = serializers.JSONField(required=False)
    sceneSettings = serializers.JSONField(source="scene_settings", required=False)
    architecture = serializers.JSONField(required=False, write_only=True)

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
        ]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.setdefault("measurements", [])
        validated_data.setdefault("connections", [])
        validated_data.setdefault("scene_settings", {})
        validated_data.pop("architecture", None)
        return Project.objects.create(owner=request.user, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("architecture", None)
        for field in [
            "name",
            "room",
            "items",
            "connections",
            "measurements",
            "scene_settings",
            "created_at",
            "updated_at",
        ]:
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
