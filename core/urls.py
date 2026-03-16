from django.urls import path

from . import views

urlpatterns = [
    path("api/health", views.health),
    path("api/sources/", views.list_sources),
    path("api/jobs/", views.list_jobs),
    path("api/runs/", views.runs_view),
]
