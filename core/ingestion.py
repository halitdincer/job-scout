import logging

from django.utils import timezone

from core.adapters import get_adapter
from core.models import JobListing

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


def _process_source(source, fetched, result):
    now = timezone.now()
    fetched_ids = set()

    for item in fetched:
        fetched_ids.add(item["external_id"])
        listing, created = JobListing.objects.get_or_create(
            source=source,
            external_id=item["external_id"],
            defaults={
                "title": item["title"],
                "department": item.get("department"),
                "location": item.get("location"),
                "url": item["url"],
                "status": "active",
            },
        )
        if created:
            result["listings_created"] += 1
        else:
            listing.title = item["title"]
            listing.department = item.get("department")
            listing.location = item.get("location")
            listing.url = item["url"]
            listing.last_seen_at = now
            listing.status = "active"
            listing.save()
            result["listings_updated"] += 1

    expired_count = (
        JobListing.objects.filter(source=source, status="active")
        .exclude(external_id__in=fetched_ids)
        .update(status="expired")
    )
    result["listings_expired"] += expired_count
