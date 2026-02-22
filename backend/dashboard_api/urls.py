from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("metadata/", views.metadata, name="metadata"),
    path("summary/", views.summary, name="summary"),
    path("charts/", views.charts, name="charts"),
    path("insights/", views.insights, name="insights"),
    path("table/", views.table, name="table"),
    path("cluster-profile/<str:cluster_id>/", views.cluster_profile, name="cluster_profile"),
    path("ranking-profile/<str:ranking_type>/", views.ranking_profile, name="ranking_profile"),
    path("bucket-profile/<str:bucket_type>/", views.bucket_profile, name="bucket_profile"),
]
