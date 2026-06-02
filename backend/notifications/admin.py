from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ["ntype", "recipient", "actor", "is_read", "created_at"]
    list_filter   = ["ntype", "is_read"]
    search_fields = ["recipient__email", "actor__email"]
    readonly_fields = ["id", "created_at"]
