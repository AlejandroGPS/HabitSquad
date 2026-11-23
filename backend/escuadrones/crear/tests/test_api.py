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
        email="creador@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_create_escuadron_requires_authentication(api_client):
    response = api_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "Madrugadores"},
        format="json",
    )

    assert response.status_code == 401
    assert Escuadron.objects.count() == 0


@pytest.mark.django_db
def test_create_escuadron_assigns_authenticated_user_as_creator_and_admin(
    auth_client,
    user,
):
    response = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "  Madrugadores  "},
        format="json",
    )

    assert response.status_code == 201
    escuadron = Escuadron.objects.get()
    assert set(response.data) == {
        "id",
        "nombre",
        "codigo_invitacion",
        "es_publico",
        "limite_miembros",
        "creador_id",
        "miembros",
    }
    assert response.data["id"] == escuadron.pk
    assert response.data["nombre"] == "Madrugadores"
    assert response.data["es_publico"] is False
    assert response.data["limite_miembros"] == 5
    assert response.data["creador_id"] == user.pk
    assert response.data["miembros"] == [
        {"usuario_id": user.pk, "es_administrador": True},
    ]

    assert escuadron.creador == user
    membresia = Membresia.objects.get(escuadron=escuadron)
    assert membresia.usuario == user
    assert membresia.es_administrador is True


@pytest.mark.django_db
def test_create_escuadron_returns_unique_six_character_invitation_code(auth_client):
    response = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "Madrugadores"},
        format="json",
    )

    assert response.status_code == 201
    code = response.data["codigo_invitacion"]
    assert len(code) == 6
    assert code.isalnum()
    assert code == code.upper()
    assert Escuadron.objects.get().codigo_invitacion == code


@pytest.mark.django_db
def test_create_escuadron_generates_distinct_invitation_codes(auth_client):
    first = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "Escuadrón A"},
        format="json",
    )
    second = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "Escuadrón B"},
        format="json",
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.data["codigo_invitacion"] != second.data["codigo_invitacion"]
    assert Escuadron.objects.count() == 2


@pytest.mark.django_db
def test_create_escuadron_rejects_blank_nombre(auth_client):
    response = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "   "},
        format="json",
    )

    assert response.status_code == 400
    assert "nombre" in response.data
    assert Escuadron.objects.count() == 0


@pytest.mark.django_db
def test_create_escuadron_rejects_missing_nombre(auth_client):
    response = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {},
        format="json",
    )

    assert response.status_code == 400
    assert "nombre" in response.data


@pytest.mark.django_db
def test_create_escuadron_rejects_nombre_too_long(auth_client):
    response = auth_client.post(
        reverse("escuadrones:crear-escuadron"),
        {"nombre": "a" * 101},
        format="json",
    )

    assert response.status_code == 400
    assert "nombre" in response.data
    assert Escuadron.objects.count() == 0


def test_create_escuadron_is_included_in_openapi_schema(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    assert "/api/escuadrones/" in response.data["paths"]
    operation = response.data["paths"]["/api/escuadrones/"]["post"]
    assert "miembro administrador" in operation["description"]
    assert set(operation["responses"]) == {"201", "400", "401"}
