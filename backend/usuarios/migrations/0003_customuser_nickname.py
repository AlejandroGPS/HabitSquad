from django.db import migrations, models
from django.db.models.functions import Lower


def backfill_nicknames(apps, schema_editor):
    CustomUser = apps.get_model("usuarios", "CustomUser")
    used: set[str] = set()

    for user in CustomUser.objects.all().order_by("pk").iterator():
        local_part = (user.email or "user").split("@", 1)[0]
        base = (
            "".join(
                character
                for character in local_part
                if character.isalnum() or character in "_-"
            )[:40]
            or "user"
        )
        candidate = base
        suffix = 0
        while candidate.casefold() in used:
            suffix += 1
            candidate = f"{base}{suffix}"
        user.nickname = candidate
        used.add(candidate.casefold())
        user.save(update_fields=["nickname"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("usuarios", "0002_customuser_email_verified"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="nickname",
            field=models.CharField(
                default="",
                help_text="Public display name. Unique without case sensitivity.",
                max_length=50,
                verbose_name="nickname",
            ),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_nicknames, noop_reverse),
        migrations.AddConstraint(
            model_name="customuser",
            constraint=models.UniqueConstraint(
                Lower("nickname"),
                name="usuarios_customuser_nickname_ci_uniq",
            ),
        ),
    ]
