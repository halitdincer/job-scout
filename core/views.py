import json
import math

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.db.models import BooleanField, Exists, Min, OuterRef, Value
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from core.filter_expression import build_filter_q, validate_filter_expression
from core.ingestion import ingest_sources
from core.models import JobListing, LocationTag, Run, SavedView, SeenListing, Source


SORT_FIELD_TO_DB = {
    "title": "title",
    "department": "department",
    "team": "team",
    "status": "status",
    "employment_type": "employment_type",
    "workplace_type": "workplace_type",
    "source_name": "source__name",
    "published_at": "published_at",
    "first_seen_at": "first_seen_at",
    "last_seen_at": "last_seen_at",
    "updated_at_source": "updated_at_source",
    "expired_at": "expired_at",
    "country": "__sort_country",
    "region": "__sort_region",
    "city": "__sort_city",
    "seen": "__sort_seen",
}
SORT_FIELDS = tuple(SORT_FIELD_TO_DB.keys())
DEFAULT_SORT = [{"field": "first_seen_at", "dir": "desc"}]
PAGE_SIZE_ALLOWLIST = (25, 50, 100, 250)
DEFAULT_PAGE_SIZE = 50


class _ParamError(ValueError):
    """Raised when a query-string parameter is malformed."""


def _parse_sort(raw):
    if raw is None or raw == "":
        return list(DEFAULT_SORT)
    sort_specs = []
    for token in raw.split(","):
        token = token.strip()
        if ":" not in token:
            raise _ParamError(
                f"Invalid sort token '{token}'. Expected 'field:dir'. "
                f"Valid fields: {', '.join(SORT_FIELDS)}."
            )
        field, _, direction = token.partition(":")
        field = field.strip()
        direction = direction.strip().lower()
        if field not in SORT_FIELD_TO_DB:
            raise _ParamError(
                f"Invalid sort field '{field}'. "
                f"Valid fields: {', '.join(SORT_FIELDS)}."
            )
        if direction not in ("asc", "desc"):
            raise _ParamError(
                f"Invalid sort direction '{direction}' for field '{field}'. "
                f"Must be 'asc' or 'desc'."
            )
        sort_specs.append({"field": field, "dir": direction})
    return sort_specs


def _parse_page_size(raw):
    if raw is None or raw == "":
        return DEFAULT_PAGE_SIZE
    try:
        value = int(raw)
    except ValueError as exc:
        raise _ParamError(f"page_size must be an integer: {exc}") from exc
    if value not in PAGE_SIZE_ALLOWLIST:
        raise _ParamError(
            f"page_size must be one of {list(PAGE_SIZE_ALLOWLIST)}; got {value}."
        )
    return value


def _parse_page(raw):
    if raw is None or raw == "":
        return 1
    try:
        value = int(raw)
    except ValueError as exc:
        raise _ParamError(f"page must be an integer: {exc}") from exc
    if value < 1:
        raise _ParamError(f"page must be >= 1; got {value}.")
    return value


def _sort_annotations(user, fields):
    annots = {}
    if "country" in fields:
        annots["__sort_country"] = Min("locations__country_code")
    if "region" in fields:
        annots["__sort_region"] = Min("locations__region_code")
    if "city" in fields:
        annots["__sort_city"] = Min("locations__city")
    if "seen" in fields:
        if user.is_authenticated:
            annots["__sort_seen"] = Exists(
                SeenListing.objects.filter(user=user, listing=OuterRef("pk"))
            )
        else:
            annots["__sort_seen"] = Value(False, output_field=BooleanField())
    return annots


def _apply_sort(qs, sort_specs, user):
    fields_used = {s["field"] for s in sort_specs}
    annots = _sort_annotations(user, fields_used)
    if annots:
        qs = qs.annotate(**annots)
    order_by = []
    for spec in sort_specs:
        db_col = SORT_FIELD_TO_DB[spec["field"]]
        order_by.append(f"-{db_col}" if spec["dir"] == "desc" else db_col)
    order_by.append("id")  # stable tiebreaker for pagination
    return qs.order_by(*order_by)


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

    try:
        sort_specs = _parse_sort(request.GET.get("sort"))
        page_size = _parse_page_size(request.GET.get("page_size"))
        page = _parse_page(request.GET.get("page"))
    except _ParamError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    qs = qs.prefetch_related("locations").distinct()
    qs = _apply_sort(qs, sort_specs, request.user)

    count = qs.count()
    total_pages = math.ceil(count / page_size) if count else 0

    if count == 0:
        if page != 1:
            return JsonResponse(
                {"error": f"page {page} is out of range (no results)."},
                status=400,
            )
    elif page > total_pages:
        return JsonResponse(
            {
                "error": (
                    f"page {page} is out of range; total_pages is {total_pages}."
                )
            },
            status=400,
        )

    offset = (page - 1) * page_size
    listings = list(qs[offset : offset + page_size])

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

    results = []
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
        results.append({
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

    return JsonResponse(
        {
            "results": results,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "sort": sort_specs,
        }
    )


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

    Run.objects.filter(status="running").update(
        status="failed",
        error_message="Marked as failed: stale running state",
        finished_at=timezone.now(),
    )

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


def _serialize_view(view):
    return {
        "id": view.id,
        "name": view.name,
        "filter_expression": view.filter_expression,
        "columns": view.columns,
        "sort": view.sort,
        "config": view.config,
        "created_at": view.created_at.isoformat(),
        "updated_at": view.updated_at.isoformat(),
    }


class _SavedViewValidationError(ValueError):
    """Raised when a saved-view payload fails shape validation."""


def _validate_saved_view_sort(raw):
    if not isinstance(raw, list):
        raise _SavedViewValidationError("sort must be a list")
    for item in raw:
        if not isinstance(item, dict):
            raise _SavedViewValidationError(
                "sort items must be objects of shape {field, dir}"
            )
        field = item.get("field")
        direction = item.get("dir")
        if not isinstance(field, str) or field not in SORT_FIELD_TO_DB:
            raise _SavedViewValidationError(
                f"sort item has invalid field {field!r}. "
                f"Valid fields: {', '.join(SORT_FIELDS)}."
            )
        if direction not in ("asc", "desc"):
            raise _SavedViewValidationError(
                f"sort item for {field!r} has invalid dir {direction!r}; "
                f"must be 'asc' or 'desc'."
            )
    return raw


def _validate_saved_view_columns(raw):
    if not isinstance(raw, list):
        raise _SavedViewValidationError("columns must be a list")
    for item in raw:
        if not isinstance(item, dict):
            raise _SavedViewValidationError(
                "columns items must be objects of shape {field, visible?}"
            )
        field = item.get("field")
        if not isinstance(field, str) or not field:
            raise _SavedViewValidationError(
                "columns item missing string 'field'"
            )
        if "visible" in item and not isinstance(item["visible"], bool):
            raise _SavedViewValidationError(
                f"columns item {field!r} has non-bool 'visible'"
            )
    return raw


def _validate_saved_view_config(raw):
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise _SavedViewValidationError("config must be an object")
    if "page_size" in raw:
        size = raw["page_size"]
        if not isinstance(size, int) or isinstance(size, bool):
            raise _SavedViewValidationError(
                f"config.page_size must be an integer; got {type(size).__name__}."
            )
        if size not in PAGE_SIZE_ALLOWLIST:
            raise _SavedViewValidationError(
                f"config.page_size must be one of {list(PAGE_SIZE_ALLOWLIST)}; "
                f"got {size}."
            )
    return raw


@csrf_exempt
@login_required
@require_http_methods(["GET", "POST"])
def saved_views_list(request):
    if request.method == "GET":
        views = SavedView.objects.filter(user=request.user)
        return JsonResponse([_serialize_view(v) for v in views], safe=False)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = body.get("name", "").strip()
    if not name:
        return JsonResponse({"error": "name is required"}, status=400)

    if "columns" not in body:
        return JsonResponse({"error": "columns must be a list"}, status=400)
    if "sort" not in body:
        return JsonResponse({"error": "sort must be a list"}, status=400)
    try:
        columns = _validate_saved_view_columns(body["columns"])
        sort = _validate_saved_view_sort(body["sort"])
        config = _validate_saved_view_config(body.get("config"))
    except _SavedViewValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    filter_expression = body.get("filter_expression")
    if filter_expression is not None:
        try:
            validate_filter_expression(filter_expression)
        except ValueError as exc:
            return JsonResponse(
                {"error": f"Invalid filter_expression: {exc}"}, status=400
            )

    try:
        view = SavedView.objects.create(
            user=request.user,
            name=name,
            filter_expression=filter_expression,
            columns=columns,
            sort=sort,
            config=config,
        )
    except Exception:
        return JsonResponse(
            {"error": f"A view named '{name}' already exists"}, status=409
        )

    return JsonResponse(_serialize_view(view), status=201)


@csrf_exempt
@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def saved_view_detail(request, view_id):
    view = get_object_or_404(SavedView, id=view_id, user=request.user)

    if request.method == "GET":
        return JsonResponse(_serialize_view(view))

    if request.method == "DELETE":
        view.delete()
        return JsonResponse({}, status=204)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = body.get("name", "").strip()
    if not name:
        return JsonResponse({"error": "name is required"}, status=400)

    if "columns" not in body:
        return JsonResponse({"error": "columns must be a list"}, status=400)
    if "sort" not in body:
        return JsonResponse({"error": "sort must be a list"}, status=400)
    try:
        columns = _validate_saved_view_columns(body["columns"])
        sort = _validate_saved_view_sort(body["sort"])
        config = _validate_saved_view_config(body.get("config"))
    except _SavedViewValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    filter_expression = body.get("filter_expression")
    if filter_expression is not None:
        try:
            validate_filter_expression(filter_expression)
        except ValueError as exc:
            return JsonResponse(
                {"error": f"Invalid filter_expression: {exc}"}, status=400
            )

    view.name = name
    view.filter_expression = filter_expression
    view.columns = columns
    view.sort = sort
    view.config = config
    view.save()

    return JsonResponse(_serialize_view(view))
