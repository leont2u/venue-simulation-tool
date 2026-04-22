from rest_framework import serializers

from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    createdAt = serializers.DateTimeField(source="created_at", required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", required=False)
    measurements = serializers.JSONField(required=False)
    sceneSettings = serializers.JSONField(source="scene_settings", required=False)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "createdAt",
            "updatedAt",
            "room",
            "items",
            "measurements",
            "sceneSettings",
        ]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data.setdefault("measurements", [])
        validated_data.setdefault("scene_settings", {})
        return Project.objects.create(owner=request.user, **validated_data)

    def update(self, instance, validated_data):
        for field in [
            "name",
            "room",
            "items",
            "measurements",
            "scene_settings",
            "created_at",
            "updated_at",
        ]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        instance.save()
        return instance

