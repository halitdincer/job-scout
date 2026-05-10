from django.db import migrations


SOURCES_TO_SEED = [
    ("AON", "jibe", "jobs.aon.com"),
    ("S&P Global", "workday", "spgi:wd5:SPGI_Careers"),
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
        ("core", "0012_alter_source_platform_jibe"),
    ]

    operations = [
        migrations.RunPython(seed_sources, migrations.RunPython.noop),
    ]
