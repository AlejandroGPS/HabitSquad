import pytest

from autenticacion.registro.services.registration import create_registered_user
from usuarios.models import CustomUser


@pytest.mark.django_db
def test_create_registered_user_persists_normalized_email_and_hashed_password():
    user = create_registered_user(
        email="Person@Example.com",
        password="S0mething!Secure-497",
        nickname="HabitHero",
    )

    assert user.email == "person@example.com"
    assert user.nickname == "HabitHero"
    assert user.email_verified is False
    assert user.pk is not None
    assert user.check_password("S0mething!Secure-497")
    assert CustomUser.objects.filter(pk=user.pk).exists()
