from django.contrib.auth.decorators import login_required
from django.urls import path

from . import views, views_spa

urlpatterns = [
    path("", login_required(views_spa.spa_index), name="jobs"),
    path("sources/", login_required(views_spa.spa_index), name="sources"),
    path("runs/", login_required(views_spa.spa_index), name="runs"),
    path("api/health", views.health),
    path("api/sources/", views.list_sources),
    path("api/jobs/", views.list_jobs),
    path("api/jobs/facets/", views.jobs_facets),
    path("api/jobs/<int:listing_id>/seen/", views.mark_listing_seen),
    path("api/locations/", views.list_locations),
    path("api/runs/", views.runs_view),
    path("api/views/", views.saved_views_list),
    path("api/views/<int:view_id>/", views.saved_view_detail),
]
