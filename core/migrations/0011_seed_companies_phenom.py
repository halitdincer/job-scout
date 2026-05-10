from django.db import migrations


SOURCES_TO_SEED = [
    ("RBC", "phenom", "jobs.rbc.com/ca/en:RBCAA0088"),
    ("BMO", "phenom", "jobs.bmo.com/ca/en:BOMOGLOBAL"),
    ("OMERS", "phenom", "careers.omers.com/ca/en:OMEOMECA"),
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
        ("core", "0010_alter_source_platform"),
    ]

    operations = [
        migrations.RunPython(seed_sources, migrations.RunPython.noop),
    ]
