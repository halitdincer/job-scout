from django.contrib import admin

from core.models import JobListing, Run, Source


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ("name", "platform", "board_id", "is_active")
    search_fields = ("name", "board_id")
    list_filter = ("platform", "is_active")


@admin.register(JobListing)
class JobListingAdmin(admin.ModelAdmin):
    list_display = ("title", "source", "department", "location", "status", "first_seen_at")
    search_fields = ("title", "department")
    list_filter = ("status", "source")


@admin.register(Run)
class RunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "started_at",
        "finished_at",
        "sources_processed",
        "listings_created",
        "listings_expired",
    )
    list_filter = ("status",)
