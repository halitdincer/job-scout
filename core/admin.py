from django.contrib import admin

from core.models import JobListing, LocationTag, Run, Source


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ("name", "platform", "board_id", "is_active")
    search_fields = ("name", "board_id")
    list_filter = ("platform", "is_active")


@admin.register(JobListing)
class JobListingAdmin(admin.ModelAdmin):
    list_display = ("title", "source", "department", "status", "employment_type", "workplace_type", "expired_at", "first_seen_at")
    search_fields = ("title", "department")
    list_filter = ("status", "source", "employment_type", "workplace_type")


@admin.register(LocationTag)
class LocationTagAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


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
