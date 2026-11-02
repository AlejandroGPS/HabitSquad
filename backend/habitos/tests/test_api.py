import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario
from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def creator(db):
    return CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def member(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def squad(creator):
    return Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )


@pytest.fixture
def membership(squad, member):
    return Membresia.objects.create(
        escuadron=squad,
        usuario=member,
    )


@pytest.fixture
def authenticated_client(api_client, member):
    token = AccessToken.for_user(member)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def habit_url(squad):
    return reverse("habitos:habito-diario", kwargs={"escuadron_id": squad.pk})


@pytest.mark.django_db
def test_habito_requires_authentication(api_client, squad):
    response = api_client.get(habit_url(squad))

    assert response.status_code == 401


@pytest.mark.django_db
def test_habito_rejects_non_member(authenticated_client, squad):
    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 403
    assert response.data["detail"] == "El usuario no pertenece a este escuadrón."


@pytest.mark.django_db
def test_habito_rejects_unknown_squad(authenticated_client):
    response = authenticated_client.get(
        reverse("habitos:habito-diario", kwargs={"escuadron_id": 999})
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_put_creates_habito_for_authenticated_member(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "leer",
            "texto_personalizado": "",
        },
        format="json",
    )

    assert response.status_code == 200
    habit = HabitoDiario.objects.get(membresia=membership)
    assert response.data["id"] == habit.pk
    assert response.data["opcion"] == "leer"
    assert response.data["texto_personalizado"] == ""


@pytest.mark.django_db
def test_get_returns_existing_habito(authenticated_client, membership, squad):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.GIMNASIO,
    )

    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 200
    assert response.data["id"] == habit.pk
    assert response.data["opcion"] == "gimnasio"


@pytest.mark.django_db
def test_get_returns_not_found_when_member_has_no_habito(
    authenticated_client,
    membership,
    squad,
):
    response = authenticated_client.get(habit_url(squad))

    assert response.status_code == 404
    assert not HabitoDiario.objects.filter(membresia=membership).exists()


@pytest.mark.django_db
def test_put_updates_existing_habito(authenticated_client, membership, squad):
    habit = HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.GIMNASIO,
    )

    response = authenticated_client.put(
        habit_url(squad),
        {
            "opcion": "estudiar",
            "texto_personalizado": "",
        },
        format="json",
    )

    habit.refresh_from_db()
    assert response.status_code == 200
    assert habit.pk == response.data["id"]
    assert habit.opcion == "estudiar"
    assert HabitoDiario.objects.filter(membresia=membership).count() == 1
