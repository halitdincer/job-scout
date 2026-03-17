from django.urls import path

from . import views

urlpatterns = [
    path("", views.jobs_page, name="jobs"),
    path("sources/", views.sources_page, name="sources"),
    path("runs/", views.runs_page, name="runs"),
    path("api/health", views.health),
    path("api/sources/", views.list_sources),
    path("api/jobs/", views.list_jobs),
    path("api/locations/", views.list_locations),
    path("api/runs/", views.runs_view),
]
