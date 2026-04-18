from django.db import migrations


SOURCES_TO_SEED = [
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
]


def seed_sources(apps, schema_editor):
    Source = apps.get_model("core", "Source")

    for name, platform, board_id in SOURCES_TO_SEED:
        Source.objects.get_or_create(
            platform=platform,
            board_id=board_id,
            defaults={
                "name": name,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_seenlisting"),
    ]

    operations = [
        migrations.RunPython(seed_sources, migrations.RunPython.noop),
    ]
