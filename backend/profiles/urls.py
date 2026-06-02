from django.urls import path
from .views import MyProfileView, PlannerProfileView

urlpatterns = [
    path("me/",           MyProfileView.as_view()),
    path("<slug:handle>/", PlannerProfileView.as_view()),
]
