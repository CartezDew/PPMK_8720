from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("metadata/", views.metadata, name="metadata"),
    path("summary/", views.summary, name="summary"),
    path("charts/", views.charts, name="charts"),
    path("insights/", views.insights, name="insights"),
    path("table/", views.table, name="table"),
]
