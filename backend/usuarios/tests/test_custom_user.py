import pytest
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import identify_hasher
from django.db import IntegrityError, transaction

from usuarios.models import CustomUser


@pytest.mark.django_db
def test_user_uses_big_auto_field_primary_key():
    user = CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
    )

    assert user.pk is not None
    assert CustomUser._meta.pk.get_internal_type() == "BigAutoField"
    assert user.date_joined is not None
    assert CustomUser.USERNAME_FIELD == "email"
    assert "username" not in [field.name for field in CustomUser._meta.fields]
    assert user.nickname == "person"


@pytest.mark.django_db
def test_create_user_accepts_explicit_nickname():
    user = CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
        nickname="  HabitHero  ",
    )

    assert user.nickname == "HabitHero"


@pytest.mark.django_db
def test_user_nickname_is_unique_without_case_sensitivity():
    CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
        nickname="HabitHero",
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        CustomUser.objects.create_user(
            email="other@example.com",
            password="another-safe-password",
            nickname="habithero",
        )


@pytest.mark.django_db
def test_user_string_representation_is_email():
    user = CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
    )

    assert str(user) == "person@example.com"


@pytest.mark.django_db
def test_user_email_is_normalized_to_lowercase():
    user = CustomUser.objects.create_user(
        email="  Person@Example.COM ",
        password="safe-test-password",
    )

    assert user.email == "person@example.com"


@pytest.mark.django_db
def test_user_email_is_unique_without_case_sensitivity():
    CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        CustomUser.objects.create_user(
            email="PERSON@EXAMPLE.COM",
            password="another-safe-password",
        )


@pytest.mark.django_db
def test_user_password_is_hashed():
    raw_password = "safe-test-password"
    user = CustomUser.objects.create_user(
        email="person@example.com",
        password=raw_password,
    )

    assert user.password != raw_password
    assert identify_hasher(user.password)
    assert user.check_password(raw_password)


@pytest.mark.django_db
def test_user_can_authenticate_with_email_case_insensitively():
    user = CustomUser.objects.create_user(
        email="person@example.com",
        password="safe-test-password",
    )

    authenticated_user = authenticate(
        email="PERSON@EXAMPLE.COM",
        password="safe-test-password",
    )

    assert authenticated_user == user


def test_create_user_rejects_empty_email():
    with pytest.raises(ValueError, match="An email address is required"):
        CustomUser.objects.create_user(email="", password="safe-test-password")


@pytest.mark.django_db
def test_create_superuser_sets_staff_and_superuser_flags():
    user = CustomUser.objects.create_superuser(
        email="admin@example.com",
        password="safe-test-password",
    )

    assert user.is_staff is True
    assert user.is_superuser is True


def test_create_superuser_rejects_non_staff_user():
    with pytest.raises(ValueError, match="is_staff=True"):
        CustomUser.objects.create_superuser(
            email="admin@example.com",
            password="safe-test-password",
            is_staff=False,
        )


def test_create_superuser_rejects_non_superuser():
    with pytest.raises(ValueError, match="is_superuser=True"):
        CustomUser.objects.create_superuser(
            email="admin@example.com",
            password="safe-test-password",
            is_superuser=False,
        )
