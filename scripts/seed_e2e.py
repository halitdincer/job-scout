"""Seed a deterministic dataset for Playwright E2E tests.

Run with DATABASE_URL pointing at the SQLite e2e DB, e.g.:

    DATABASE_URL=sqlite:///e2e.sqlite3 \\
        ./.venv/bin/python scripts/seed_e2e.py

Creates exactly 300 listings with titles "Listing 000" through
"Listing 299" so sort-by-title assertions can be written against known
boundary rows (e.g. page 1 ascending starts with "Listing 000", page 6
ascending ends with "Listing 299").
"""

import os
import sys
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jobscout.settings")

    import django

    django.setup()

    from django.contrib.auth import get_user_model

    from core.models import JobListing, SavedView, SeenListing, Source

    User = get_user_model()

    # Idempotent reset of the E2E data slice (leaves Django's own auth
    # and migration state alone so repeated runs don't re-migrate).
    SavedView.objects.all().delete()
    SeenListing.objects.all().delete()
    JobListing.objects.all().delete()
    Source.objects.all().delete()
    User.objects.filter(username="e2e").delete()

    User.objects.create_user(username="e2e", password="e2e-pass-123")

    source = Source.objects.create(
        name="E2E Source", platform="greenhouse", board_id="e2e-board"
    )

    JobListing.objects.bulk_create(
        [
            JobListing(
                source=source,
                external_id=f"e2e-{i:03d}",
                title=f"Listing {i:03d}",
                url=f"https://example.com/listing/{i:03d}",
                status="active",
                employment_type="full_time",
                workplace_type="remote",
            )
            for i in range(300)
        ]
    )

    print(f"Seeded {JobListing.objects.count()} listings for E2E.")


if __name__ == "__main__":
    main()
