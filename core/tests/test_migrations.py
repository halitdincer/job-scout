import importlib

import pytest
from django.apps import apps as django_apps

from core.models import Source


EXPECTED_NEW_SOURCES = {
    ("Anthropic", "greenhouse", "anthropic"),
    ("Duolingo", "greenhouse", "duolingo"),
    ("HubSpot", "greenhouse", "hubspot"),
    ("Coinbase", "greenhouse", "coinbase"),
    ("Cloudflare", "greenhouse", "cloudflare"),
    ("Figma", "greenhouse", "figma"),
    ("Databricks", "greenhouse", "databricks"),
    ("Datadog", "greenhouse", "datadog"),
    ("Discord", "greenhouse", "discord"),
    ("Twitch", "greenhouse", "twitch"),
    ("Airbnb", "greenhouse", "airbnb"),
    ("Instacart", "greenhouse", "instacart"),
    ("Robinhood", "greenhouse", "robinhood"),
    ("Atlassian", "lever", "atlassian"),
    ("Ramp", "ashby", "ramp"),
    ("Notion", "ashby", "notion"),
    ("Deel", "ashby", "deel"),
    ("Quora", "ashby", "quora"),
    ("Linear", "ashby", "linear"),
    ("Vercel", "ashby", "vercel"),
}


@pytest.mark.django_db
class TestSeedSourcesMigration:
    def test_seed_sources_creates_expected_sources(self):
        migration = importlib.import_module("core.migrations.0006_seed_sources")

        Source.objects.filter(
            board_id__in=[board_id for _, _, board_id in EXPECTED_NEW_SOURCES]
        ).delete()

        migration.seed_sources(django_apps, None)

        actual = set(Source.objects.values_list("name", "platform", "board_id"))
        assert EXPECTED_NEW_SOURCES.issubset(actual)
        assert Source.objects.filter(
            board_id__in=[board_id for _, _, board_id in EXPECTED_NEW_SOURCES]
        ).count() == len(EXPECTED_NEW_SOURCES)

    def test_seed_sources_is_idempotent_and_skips_existing_sources(self):
        migration = importlib.import_module("core.migrations.0006_seed_sources")
        existing = Source.objects.get(platform="greenhouse", board_id="anthropic")
        existing.name = "Existing Anthropic"
        existing.is_active = False
        existing.save(update_fields=["name", "is_active", "updated_at"])

        migration.seed_sources(django_apps, None)
        migration.seed_sources(django_apps, None)

        existing.refresh_from_db()
        assert existing.name == "Existing Anthropic"
        assert existing.is_active is False
        assert Source.objects.filter(platform="greenhouse", board_id="anthropic").count() == 1
        assert Source.objects.filter(
            board_id__in=[board_id for _, _, board_id in EXPECTED_NEW_SOURCES]
        ).count() == len(EXPECTED_NEW_SOURCES)
