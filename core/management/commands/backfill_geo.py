import time

from django.core.management.base import BaseCommand

from core.geo import geocode_location
from core.models import LocationTag


class Command(BaseCommand):
    help = "Backfill geo fields on unmapped LocationTags using Nominatim"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview changes without writing to the database",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        unmapped = LocationTag.objects.filter(country_code__isnull=True)
        total = unmapped.count()

        if total == 0:
            self.stdout.write("No unmapped LocationTags found.")
            return

        self.stdout.write(f"Found {total} unmapped LocationTags.")
        updated = 0
        skipped = 0

        for i, tag in enumerate(unmapped):
            if i > 0:
                time.sleep(1)

            geo = geocode_location(tag.name)

            if not geo["country_code"]:
                skipped += 1
                self.stdout.write(f"  No result for '{tag.name}', skipped.")
                continue

            if dry_run:
                self.stdout.write(
                    f"  [dry run] Would set '{tag.name}': "
                    f"country={geo['country_code']}, "
                    f"region={geo['region_code']}, "
                    f"city={geo['city']}"
                )
            else:
                tag.country_code = geo["country_code"]
                tag.region_code = geo["region_code"]
                tag.city = geo["city"]
                tag.save()
                self.stdout.write(
                    f"  Updated '{tag.name}': "
                    f"country={geo['country_code']}, "
                    f"region={geo['region_code']}, "
                    f"city={geo['city']}"
                )
            updated += 1

        action = "Would update" if dry_run else "Updated"
        self.stdout.write(f"\n{action} {updated}, skipped {skipped} of {total}.")
