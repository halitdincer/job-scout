from django.core.management.base import BaseCommand

from core.ingestion import ingest_sources
from core.models import Source


class Command(BaseCommand):
    help = "Ingest job listings from all active sources"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-id", type=int, help="Ingest only this source"
        )

    def handle(self, *args, **options):
        source_id = options.get("source_id")

        if source_id:
            sources = Source.objects.filter(pk=source_id, is_active=True)
            if not sources.exists():
                self.stderr.write(f"Source with id {source_id} not found or inactive.")
                return
        else:
            sources = Source.objects.filter(is_active=True)

        result = ingest_sources(sources)

        self.stdout.write(
            f"Processed {result['sources_processed']} sources: "
            f"{result['listings_created']} created, "
            f"{result['listings_updated']} updated, "
            f"{result['listings_expired']} expired"
        )

        for error in result["errors"]:
            self.stderr.write(f"Error: {error}")
