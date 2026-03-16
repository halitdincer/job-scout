import json

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from core.ingestion import ingest_sources
from core.models import JobListing, Run, Source


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

    data = [
        {
            "id": listing.id,
            "source_id": listing.source_id,
            "source_name": listing.source.name,
            "external_id": listing.external_id,
            "title": listing.title,
            "department": listing.department,
            "location": listing.location,
            "url": listing.url,
            "status": listing.status,
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
