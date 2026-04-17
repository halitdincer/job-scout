import json

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from core.filter_expression import build_filter_q
from core.ingestion import ingest_sources
from core.models import JobListing, LocationTag, Run, SeenListing, Source


@login_required
def jobs_page(request):
    return render(request, "core/jobs.html")


@login_required
def sources_page(request):
    return render(request, "core/sources.html", {
        "sources": Source.objects.all(),
    })


@login_required
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

    expression_raw = request.GET.get("filter")
    if expression_raw:
        try:
            expression = json.loads(expression_raw)
            qs = qs.filter(build_filter_q(expression))
        except (json.JSONDecodeError, ValueError) as exc:
            return JsonResponse({"error": f"Invalid filter: {exc}"}, status=400)

    qs = qs.prefetch_related("locations").distinct()
    listings = list(qs)
    seen_listing_ids = set()
    if request.user.is_authenticated:
        listing_ids = [listing.id for listing in listings]
        if listing_ids:
            seen_listing_ids = set(
                SeenListing.objects.filter(
                    user=request.user,
                    listing_id__in=listing_ids,
                ).values_list("listing_id", flat=True)
            )

    data = []
    for listing in listings:
        tags = listing.locations.all()
        locations = [
            {
                "name": tag.name,
                "country_code": tag.country_code,
                "region_code": tag.region_code,
                "city": tag.city,
                "geo_key": tag.geo_key,
            }
            for tag in tags
        ]
        country_codes = sorted(
            {tag.country_code for tag in tags if tag.country_code}
        )
        region_codes = sorted(
            {tag.region_code for tag in tags if tag.region_code}
        )
        cities = sorted(
            {tag.city for tag in tags if tag.city}
        )
        data.append({
            "id": listing.id,
            "source_id": listing.source_id,
            "source_name": listing.source.name,
            "external_id": listing.external_id,
            "title": listing.title,
            "department": listing.department,
            "locations": locations,
            "url": listing.url,
            "status": listing.status,
            "team": listing.team,
            "employment_type": listing.employment_type,
            "workplace_type": listing.workplace_type,
            "country": country_codes,
            "region": region_codes,
            "city": cities,
            "expired_at": listing.expired_at.isoformat() if listing.expired_at else None,
            "published_at": listing.published_at.isoformat() if listing.published_at else None,
            "updated_at_source": listing.updated_at_source.isoformat() if listing.updated_at_source else None,
            "first_seen_at": listing.first_seen_at.isoformat(),
            "last_seen_at": listing.last_seen_at.isoformat(),
            "seen": listing.id in seen_listing_ids,
        })
    return JsonResponse(data, safe=False)


@csrf_exempt
@login_required
@require_POST
def mark_listing_seen(request, listing_id):
    listing = get_object_or_404(JobListing, id=listing_id)
    _, created = SeenListing.objects.get_or_create(
        user=request.user,
        listing=listing,
    )
    return JsonResponse(
        {"listing_id": listing.id, "seen": True, "created": created},
        status=201 if created else 200,
    )


@require_GET
def list_locations(request):
    tags = LocationTag.objects.all()
    data = [
        {
            "id": tag.id,
            "name": tag.name,
            "country_code": tag.country_code,
            "region_code": tag.region_code,
            "city": tag.city,
            "geo_key": tag.geo_key,
        }
        for tag in tags
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

    try:
        sources = Source.objects.filter(is_active=True)
        result = ingest_sources(sources)
    except Exception as exc:
        run.status = "failed"
        run.finished_at = timezone.now()
        run.error_message = str(exc)
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
