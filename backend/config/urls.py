from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/ai/", include("ai_layout.urls")),
    path("api/imports/", include("layout_imports.urls")),
    path("api/projects/", include("projects.urls")),
]
