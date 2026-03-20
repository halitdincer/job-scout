from django.urls import resolve

from core import views


def test_health_url_resolves_to_health_view():
    match = resolve("/api/health")
    assert match.func is views.health


def test_admin_url_resolves():
    match = resolve("/admin/")
    assert match.app_name == "admin"


def test_mark_seen_url_resolves_to_view():
    match = resolve("/api/jobs/1/seen/")
    assert match.func.__name__ == views.mark_listing_seen.__name__
