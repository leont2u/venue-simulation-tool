from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/ai/", include("ai_layout.urls")),
    path("api/assets/", include("assets.urls")),
    path("api/imports/", include("layout_imports.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/community/", include("community.urls")),
    path("api/planners/", include("profiles.urls")),
    path("api/notifications/", include("notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
