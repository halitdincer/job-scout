from django.core.management.base import BaseCommand

from core.location_normalization import get_parsing_profile, normalize_location_value
from core.models import LocationTag


class Command(BaseCommand):
    help = "Normalize malformed/composite LocationTags and relink listings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview remediation without writing to the database",
        )
        parser.add_argument(
            "--delete-obsolete",
            action="store_true",
            help="Delete remediated tags once no listings reference them",
        )

    def _get_best_profile(self, tag):
        listings = tag.joblisting_set.select_related("source").all()
        profiles = set()
        for listing in listings:
            src = listing.source
            profiles.add(get_parsing_profile(src.platform, src.board_id))
        if len(profiles) == 1:
            return profiles.pop()
        if "stripe" in profiles:
            return "stripe"
        return "default"  # pragma: no cover — multiple non-default profiles not yet registered

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        delete_obsolete = options["delete_obsolete"]

        created_tags = 0
        relinked_listings = 0
        deleted_tags = 0
        skipped_tags = 0
        unchanged_tags = 0

        if dry_run:
            self.stdout.write("Running in dry run mode.")

        for tag in LocationTag.objects.all().order_by("id"):
            profile = self._get_best_profile(tag)
            normalized = normalize_location_value(tag.name, profile=profile)

            if not normalized:
                skipped_tags += 1
                self.stdout.write(f"  Skipped '{tag.name}' (no parseable location)")
                continue

            if len(normalized) == 1 and normalized[0] == tag.name:
                unchanged_tags += 1
                continue

            listings = list(tag.joblisting_set.all())
            if dry_run:
                relinked_listings += len(listings)
                missing_count = 0
                for name in normalized:
                    if not LocationTag.objects.filter(name=name).exists():
                        missing_count += 1
                created_tags += missing_count
                self.stdout.write(
                    f"  [dry run] '{tag.name}' -> {normalized} "
                    f"({len(listings)} listing(s))"
                )
                continue

            replacements = []
            for name in normalized:
                replacement, created = LocationTag.objects.get_or_create(name=name)
                if created:
                    created_tags += 1
                replacements.append(replacement)

            for listing in listings:
                listing.locations.add(*replacements)
                listing.locations.remove(tag)
                relinked_listings += 1

            if delete_obsolete and not tag.joblisting_set.exists():
                tag.delete()
                deleted_tags += 1

            self.stdout.write(
                f"  Remediated '{tag.name}' -> {normalized} "
                f"({len(listings)} listing(s))"
            )

        action = "Would relink" if dry_run else "Relinked"
        self.stdout.write(
            f"\n{action} {relinked_listings} listing(s); "
            f"created {created_tags} tag(s); "
            f"deleted {deleted_tags} tag(s); "
            f"skipped {skipped_tags}; unchanged {unchanged_tags}."
        )
