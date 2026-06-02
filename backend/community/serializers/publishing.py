from rest_framework import serializers
from community.models import PublishedLayout


class PublishRequestSerializer(serializers.Serializer):
    title              = serializers.CharField(max_length=255)
    tagline            = serializers.CharField(max_length=500, required=False, allow_blank=True)
    event_type         = serializers.CharField(max_length=50)
    theme              = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tags               = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )
    estimated_capacity = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    cover_image_url    = serializers.URLField(required=False, allow_blank=True)


class PublishedListingSerializer(serializers.ModelSerializer):
    publisherId       = serializers.IntegerField(source="publisher_id", read_only=True)
    publisherName     = serializers.SerializerMethodField()
    moderationStatus  = serializers.CharField(source="moderation_status", read_only=True)
    eventType         = serializers.CharField(source="event_type", read_only=True)
    coverImageUrl     = serializers.URLField(source="cover_image_url", read_only=True)
    estimatedCapacity = serializers.IntegerField(source="estimated_capacity", read_only=True, allow_null=True)
    viewCount         = serializers.IntegerField(source="view_count", read_only=True)
    forkCount         = serializers.IntegerField(source="fork_count", read_only=True)
    saveCount         = serializers.IntegerField(source="save_count", read_only=True)
    likeCount         = serializers.IntegerField(source="like_count", read_only=True)
    featuredAt        = serializers.DateTimeField(source="featured_at", read_only=True, allow_null=True)
    trendingScore     = serializers.FloatField(source="trending_score", read_only=True)
    publishedAt       = serializers.DateTimeField(source="published_at", read_only=True)
    autoApproved      = serializers.BooleanField(source="auto_approved", read_only=True)

    class Meta:
        model  = PublishedLayout
        fields = [
            "id",
            "title",
            "tagline",
            "eventType",
            "theme",
            "tags",
            "coverImageUrl",
            "estimatedCapacity",
            "moderationStatus",
            "viewCount",
            "forkCount",
            "saveCount",
            "likeCount",
            "featuredAt",
            "trendingScore",
            "publishedAt",
            "publisherId",
            "publisherName",
            "autoApproved",
        ]

    def get_publisherName(self, obj):
        user = obj.publisher
        return user.get_full_name() or user.get_username() or user.email
