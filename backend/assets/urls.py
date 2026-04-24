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
]
