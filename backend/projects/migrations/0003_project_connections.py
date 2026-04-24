from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0002_sharedproject"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="connections",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
