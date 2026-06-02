from rest_framework import serializers
from community.models import PublishedLayout


class PublishedLayoutListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the discovery feed cards.
    Excludes the full scene snapshot — that's only needed on detail view.
    """
    eventType         = serializers.CharField(source="event_type")
    coverImageUrl     = serializers.URLField(source="cover_image_url")
    estimatedCapacity = serializers.IntegerField(source="estimated_capacity", allow_null=True)
    forkCount         = serializers.IntegerField(source="fork_count")
    saveCount         = serializers.IntegerField(source="save_count")
    likeCount         = serializers.IntegerField(source="like_count")
    trendingScore     = serializers.FloatField(source="trending_score")
    publishedAt       = serializers.DateTimeField(source="published_at")
    publisher         = serializers.SerializerMethodField()
    projectId         = serializers.UUIDField(source="project_id")

    class Meta:
        model  = PublishedLayout
        fields = [
            "id",
            "projectId",
            "title",
            "tagline",
            "eventType",
            "theme",
            "tags",
            "coverImageUrl",
            "estimatedCapacity",
            "forkCount",
            "saveCount",
            "likeCount",
            "trendingScore",
            "publishedAt",
            "publisher",
        ]

    def get_publisher(self, obj):
        user = obj.publisher
        handle = None
        display_name = user.get_full_name() or user.email.split("@")[0]
        try:
            profile      = user.profile
            handle       = profile.handle
            display_name = profile.display_name or display_name
        except Exception:
            pass
        return {
            "id":       user.id,
            "username": user.get_username() or user.email,
            "name":     display_name,
            "handle":   handle,
        }


class PublishedLayoutDetailSerializer(PublishedLayoutListSerializer):
    """
    Full detail view — includes the published snapshot for the 3D preview.
    The snapshot is what was captured at publish time, not the live project.
    """
    publishedSnapshot = serializers.JSONField(source="published_snapshot")
    attribution       = serializers.SerializerMethodField()

    class Meta(PublishedLayoutListSerializer.Meta):
        fields = PublishedLayoutListSerializer.Meta.fields + [
            "publishedSnapshot",
            "attribution",
        ]

    def get_attribution(self, obj):
        project = obj.project
        if not project.forked_from_id and not project.attribution_source_title:
            return None
        return {
            "sourceId":      str(project.forked_from_id) if project.forked_from_id else None,
            "sourceTitle":   project.attribution_source_title,
            "sourceCreator": project.attribution_source_creator,
        }
