from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ["handle", "display_name", "user", "is_verified", "created_at"]
    list_filter   = ["is_verified"]
    search_fields = ["handle", "display_name", "user__email"]
    readonly_fields = ["id", "created_at", "updated_at"]
