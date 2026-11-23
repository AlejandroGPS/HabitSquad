import importlib

import pytest
from django.apps import apps

from usuarios.models import CustomUser

_nickname_migration = importlib.import_module(
    "usuarios.migrations.0003_customuser_nickname"
)


@pytest.mark.django_db
def test_nickname_migration_backfill_assigns_unique_nicknames_from_email():
    CustomUser.objects.create_user(
        email="alice@example.com",
        password="safe-test-password",
        nickname="temp-one",
    )
    CustomUser.objects.create_user(
        email="alice@other.example.com",
        password="safe-test-password",
        nickname="temp-two",
    )
    CustomUser.objects.create_user(
        email="!!!@example.com",
        password="safe-test-password",
        nickname="temp-three",
    )

    _nickname_migration.backfill_nicknames(apps, schema_editor=None)

    nicknames = {
        user.email: user.nickname for user in CustomUser.objects.order_by("pk")
    }
    assert nicknames["alice@example.com"] == "alice"
    assert nicknames["alice@other.example.com"] == "alice1"
    assert nicknames["!!!@example.com"] == "user"
    _nickname_migration.noop_reverse(apps, schema_editor=None)
