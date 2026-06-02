from django.urls import path

from . import views


urlpatterns = [
    path("poly-pizza/", views.poly_pizza_assets, name="poly-pizza-assets"),
    path("poly-pizza/models/<str:model_id>/", views.poly_pizza_model, name="poly-pizza-model"),
    path(
        "poly-pizza/thumbnails/<str:model_id>/",
        views.poly_pizza_thumbnail,
        name="poly-pizza-thumbnail",
    ),
    path("sketchfab/", views.sketchfab_assets, name="sketchfab-assets"),
    path("sketchfab/curated/", views.sketchfab_curated_assets, name="sketchfab-curated"),
    path("sketchfab/pinned/",  views.sketchfab_pinned_assets,  name="sketchfab-pinned"),
    path(
        "sketchfab/models/<str:model_id>/scene",
        views.sketchfab_model_scene,
        name="sketchfab-model-scene",
    ),
    path(
        "sketchfab/models/<str:model_id>/<path:file_path>",
        views.sketchfab_model_scene,
        name="sketchfab-model-file",
    ),
    path(
        "sketchfab/thumbnails/<str:model_id>/",
        views.sketchfab_thumbnail,
        name="sketchfab-thumbnail",
    ),
]
