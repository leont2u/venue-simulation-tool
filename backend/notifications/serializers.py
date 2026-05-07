from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actorHandle  = serializers.SerializerMethodField()
    actorName    = serializers.SerializerMethodField()
    layoutTitle  = serializers.SerializerMethodField()
    layoutId     = serializers.UUIDField(source="layout_id",  read_only=True, allow_null=True)
    projectId    = serializers.UUIDField(source="project_id", read_only=True, allow_null=True)

    class Meta:
        model  = Notification
        fields = [
            "id", "ntype", "is_read",
            "actorHandle", "actorName",
            "layoutTitle", "layoutId", "projectId",
            "created_at",
        ]

    def get_actorHandle(self, obj):
        if not obj.actor_id:
            return None
        try:
            return obj.actor.profile.handle
        except Exception:
            return None

    def get_actorName(self, obj):
        if not obj.actor_id:
            return None
        try:
            return obj.actor.profile.display_name or obj.actor.email.split("@")[0]
        except Exception:
            return obj.actor.email.split("@")[0] if obj.actor else None

    def get_layoutTitle(self, obj):
        if not obj.layout_id:
            return None
        return obj.layout.title if obj.layout else None
