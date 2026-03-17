import logging

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from core.adapters import get_adapter
from core.geo import geocode_location
from core.location_normalization import get_parsing_profile, normalize_location_values
from core.models import JobListing, LocationTag

logger = logging.getLogger(__name__)


def ingest_sources(sources):
    result = {
        "sources_processed": 0,
        "listings_created": 0,
        "listings_updated": 0,
        "listings_expired": 0,
        "errors": [],
    }

    for source in sources:
        try:
            adapter = get_adapter(source.platform)
            fetched = adapter.fetch_listings(source.board_id)
            _process_source(source, fetched, result)
            result["sources_processed"] += 1
        except Exception as e:
            error_msg = f"{source.name}: {e}"
            logger.error("Failed to ingest %s: %s", source.name, e)
            result["errors"].append(error_msg)

    return result


def _parse_dt(value):
    if not value:
        return None
    return parse_datetime(value)


def _sync_locations(listing, location_names, profile="default"):
    tags = []
    for name in normalize_location_values(location_names, profile=profile):
        tag, created = LocationTag.objects.get_or_create(name=name)
        if created:
            geo = geocode_location(name)
            tag.country_code = geo["country_code"]
            tag.region_code = geo["region_code"]
            tag.city = geo["city"]
            tag.save()
        tags.append(tag)
    listing.locations.set(tags)


def _process_source(source, fetched, result):
    now = timezone.now()
    fetched_ids = set()
    profile = get_parsing_profile(source.platform, source.board_id)

    for item in fetched:
        fetched_ids.add(item["external_id"])
        scalar_defaults = {
            "title": item["title"],
            "department": item.get("department"),
            "url": item["url"],
            "status": "active",
            "team": item.get("team"),
            "employment_type": item.get("employment_type"),
            "workplace_type": item.get("workplace_type"),
            "published_at": _parse_dt(item.get("published_at")),
            "updated_at_source": _parse_dt(item.get("updated_at_source")),
        }
        listing, created = JobListing.objects.get_or_create(
            source=source,
            external_id=item["external_id"],
            defaults=scalar_defaults,
        )
        if created:
            result["listings_created"] += 1
        else:
            for field, value in scalar_defaults.items():
                setattr(listing, field, value)
            listing.last_seen_at = now
            listing.save()
            result["listings_updated"] += 1

        _sync_locations(listing, item.get("locations", []), profile=profile)

        if item.get("is_listed") is False and listing.status == "active":
            listing.status = "expired"
            listing.expired_at = now
            listing.save()
            result["listings_expired"] += 1

    expired_count = (
        JobListing.objects.filter(source=source, status="active")
        .exclude(external_id__in=fetched_ids)
        .update(status="expired", expired_at=now)
    )
    result["listings_expired"] += expired_count
