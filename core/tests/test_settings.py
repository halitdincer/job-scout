from django.conf import settings


def test_debug_setting_exists():
    assert hasattr(settings, "DEBUG")


def test_allowed_hosts_includes_localhost():
    assert "localhost" in settings.ALLOWED_HOSTS
    assert "127.0.0.1" in settings.ALLOWED_HOSTS


def test_installed_apps_includes_core():
    assert "core" in settings.INSTALLED_APPS


def test_secret_key_is_set():
    assert settings.SECRET_KEY
