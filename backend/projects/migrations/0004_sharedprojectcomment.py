from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0003_project_connections"),
    ]

    operations = [
        migrations.CreateModel(
            name="SharedProjectComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("author_name", models.CharField(max_length=120)),
                ("body", models.TextField()),
                ("is_admin_reply", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replies",
                        to="projects.sharedprojectcomment",
                    ),
                ),
                (
                    "shared_project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="projects.sharedproject",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
    ]
