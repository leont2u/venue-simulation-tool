from django.urls import path
from venue_cv import views

urlpatterns = [
    # Upload & job creation
    path("upload/image/",   views.SingleImageUploadView.as_view(),  name="cv-upload-image"),
    path("upload/images/",  views.MultiImageUploadView.as_view(),   name="cv-upload-images"),
    path("upload/video/",   views.VideoUploadView.as_view(),        name="cv-upload-video"),

    # Job status & control
    path("jobs/<uuid:job_id>/",        views.CVJobDetailView.as_view(),  name="cv-job-detail"),
    path("jobs/<uuid:job_id>/status/", views.CVJobStatusView.as_view(),  name="cv-job-status"),
    path("jobs/<uuid:job_id>/cancel/", views.CVJobCancelView.as_view(),  name="cv-job-cancel"),

    # Stage result inspection
    path("jobs/<uuid:job_id>/detections/",  views.DetectionResultView.as_view(),  name="cv-detections"),
    path("jobs/<uuid:job_id>/depth/",       views.DepthResultView.as_view(),       name="cv-depth"),
    path("jobs/<uuid:job_id>/room-layout/", views.RoomLayoutResultView.as_view(), name="cv-room-layout"),
    path("jobs/<uuid:job_id>/scene-graph/", views.SceneGraphView.as_view(),        name="cv-scene-graph"),

    # Accept generated scene → create real Project
    path("jobs/<uuid:job_id>/accept/",  views.AcceptSceneView.as_view(),         name="cv-accept"),

    # Override asset mapping for a detected object before accepting
    path("jobs/<uuid:job_id>/assets/<uuid:mapping_id>/",
         views.AssetMappingUpdateView.as_view(), name="cv-asset-mapping"),
]
