from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path

from core import views_spa

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/login/", views_spa.spa_login, name="login"),
    path("accounts/logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("", include("core.urls")),
]
