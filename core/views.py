import json

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from core.ingestion import ingest_sources
from core.models import JobListing, Run, Source


def jobs_page(request):
    qs = JobListing.objects.select_related("source").prefetch_related("locations").order_by("-last_seen_at")

    query = request.GET.get("q", "")
    if query:
        qs = qs.filter(title__icontains=query)

    status_filter = request.GET.get("status", "")
    if status_filter:
        qs = qs.filter(status=status_filter)

    source_filter = request.GET.get("source", "")
    if source_filter:
        qs = qs.filter(source_id=source_filter)

    employment_type_filter = request.GET.get("employment_type", "")
    if employment_type_filter:
        qs = qs.filter(employment_type=employment_type_filter)

    workplace_type_filter = request.GET.get("workplace_type", "")
    if workplace_type_filter:
        qs = qs.filter(workplace_type=workplace_type_filter)

    location_filter = request.GET.get("location", "")
    if location_filter:
        qs = qs.filter(locations__name__icontains=location_filter).distinct()

    return render(request, "core/jobs.html", {
        "listings": qs,
        "sources": Source.objects.all(),
        "query": query,
        "status_filter": status_filter,
        "source_filter": source_filter,
        "employment_type_filter": employment_type_filter,
        "workplace_type_filter": workplace_type_filter,
        "location_filter": location_filter,
        "employment_type_choices": JobListing.EMPLOYMENT_TYPE_CHOICES,
        "workplace_type_choices": JobListing.WORKPLACE_TYPE_CHOICES,
    })


def sources_page(request):
    return render(request, "core/sources.html", {
        "sources": Source.objects.all(),
    })


def runs_page(request):
    return render(request, "core/runs.html", {
        "runs": Run.objects.order_by("-created_at"),
    })


def health(request):
    return JsonResponse({"status": "ok"})


@require_GET
def list_sources(request):
    sources = Source.objects.all().values(
        "id", "name", "platform", "board_id", "is_active"
    )
    return JsonResponse(list(sources), safe=False)


@require_GET
def list_jobs(request):
    qs = JobListing.objects.select_related("source").all()

    source_id = request.GET.get("source_id")
    if source_id:
        qs = qs.filter(source_id=source_id)

    status = request.GET.get("status")
    if status:
        qs = qs.filter(status=status)

    qs = qs.prefetch_related("locations")
    data = [
        {
            "id": listing.id,
            "source_id": listing.source_id,
            "source_name": listing.source.name,
            "external_id": listing.external_id,
            "title": listing.title,
            "department": listing.department,
            "locations": [tag.name for tag in listing.locations.all()],
            "url": listing.url,
            "status": listing.status,
            "team": listing.team,
            "employment_type": listing.employment_type,
            "workplace_type": listing.workplace_type,
            "country": listing.country,
            "published_at": listing.published_at.isoformat() if listing.published_at else None,
            "updated_at_source": listing.updated_at_source.isoformat() if listing.updated_at_source else None,
            "first_seen_at": listing.first_seen_at.isoformat(),
            "last_seen_at": listing.last_seen_at.isoformat(),
        }
        for listing in qs
    ]
    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def runs_view(request):
    if request.method == "GET":
        return _list_runs(request)
    return _trigger_run(request)


def _list_runs(request):
    runs = Run.objects.order_by("-created_at").values(
        "id",
        "status",
        "started_at",
        "finished_at",
        "sources_processed",
        "listings_created",
        "listings_updated",
        "listings_expired",
        "error_message",
        "created_at",
    )
    return JsonResponse(list(runs), safe=False)


def _trigger_run(request):
    api_key = settings.INGEST_API_KEY
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer ") or auth_header[7:] != api_key:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    run = Run.objects.create(status="running", started_at=timezone.now())

    sources = Source.objects.filter(is_active=True)
    result = ingest_sources(sources)

    run.finished_at = timezone.now()
    run.sources_processed = result["sources_processed"]
    run.listings_created = result["listings_created"]
    run.listings_updated = result["listings_updated"]
    run.listings_expired = result["listings_expired"]

    if result["errors"] and result["sources_processed"] == 0:
        run.status = "failed"
    else:
        run.status = "completed"

    if result["errors"]:
        run.error_message = "; ".join(result["errors"])

    run.save()

    return JsonResponse(
        {
            "id": run.id,
            "status": run.status,
            "started_at": run.started_at.isoformat(),
            "finished_at": run.finished_at.isoformat(),
            "sources_processed": run.sources_processed,
            "listings_created": run.listings_created,
            "listings_updated": run.listings_updated,
            "listings_expired": run.listings_expired,
            "error_message": run.error_message,
        },
        status=201,
    )
