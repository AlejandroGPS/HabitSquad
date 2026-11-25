import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="usuario@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def owner(db):
    return CustomUser.objects.create_user(
        email="creador@example.com",
        password="S0mething!Secure-497",
    )


def public_url():
    return reverse("escuadrones:escuadrones-publicos")


def authenticated_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def create_squad(*, name, owner, code, is_public):
    squad = Escuadron.objects.create(
        nombre=name,
        creador=owner,
        codigo_invitacion=code,
        es_publico=is_public,
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=owner,
        es_administrador=True,
    )
    return squad


@pytest.mark.django_db
def test_public_squad_list_requires_authentication(api_client):
    response = api_client.get(public_url())

    assert response.status_code == 401


@pytest.mark.django_db
def test_public_squad_list_returns_only_public_squads(api_client, user, owner):
    public_squad = create_squad(
        name="Público",
        owner=owner,
        code="X8K9QL",
        is_public=True,
    )
    create_squad(name="Privado", owner=user, code="A1B2C3", is_public=False)

    response = authenticated_client(api_client, user).get(public_url())

    assert response.status_code == 200
    assert response.data == [
        {
            "id": public_squad.pk,
            "nombre": "Público",
            "es_publico": True,
            "limite_miembros": 5,
            "miembros_actuales": 1,
            "racha": 0,
        }
    ]


@pytest.mark.django_db
def test_public_squad_list_excludes_squads_user_already_joined(api_client, user, owner):
    joined_squad = create_squad(
        name="Ya unido",
        owner=owner,
        code="X8K9QL",
        is_public=True,
    )
    available_squad = create_squad(
        name="Disponible",
        owner=owner,
        code="A1B2C3",
        is_public=True,
    )
    Membresia.objects.create(escuadron=joined_squad, usuario=user)

    response = authenticated_client(api_client, user).get(public_url())

    assert response.status_code == 200
    assert [squad["id"] for squad in response.data] == [available_squad.pk]


def test_public_squad_list_is_documented_in_openapi(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/publicos/"]["get"]
    assert operation["operationId"] == "listarEscuadronesPublicos"
    assert set(operation["responses"]) == {"200", "401"}
