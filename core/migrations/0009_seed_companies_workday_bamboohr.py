from django.db import migrations


SOURCES_TO_SEED = [
    ("TMX", "workday", "tmx:wd3:TMX_Careers"),
    ("HOOPP", "workday", "hoopp:wd10:HOOPP"),
    ("Sun Life", "workday", "sunlife:wd3:Experienced-Jobs"),
    ("Manulife", "workday", "manulife:wd3:MFCJH_Jobs"),
    ("Aviva", "workday", "aviva:wd1:External"),
    ("OTPP", "workday", "otppb:wd3:OntarioTeachers_Careers"),
    ("CIBC", "workday", "cibc:wd3:search"),
    ("CPP Investments", "workday", "cppib:wd10:cppinvestments"),
    ("Morningstar DBRS", "workday", "morningstar:wd5:Americas"),
    ("Picton Mahoney", "bamboohr", "pictonmahoney"),
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
        ("core", "0008_alter_source_platform"),
    ]

    operations = [
        migrations.RunPython(seed_sources, migrations.RunPython.noop),
    ]
