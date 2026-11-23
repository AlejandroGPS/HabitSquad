import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from usuarios.models import CustomUser

JOIN_URL = "escuadrones:unirse-escuadron"


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
def joiner(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def escuadron(creator):
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )
    Membresia.objects.create(
        escuadron=escuadron,
        usuario=creator,
        es_administrador=True,
    )
    return escuadron


@pytest.fixture
def auth_joiner(api_client, joiner):
    token = AccessToken.for_user(joiner)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_join_escuadron_requires_authentication(api_client, escuadron):
    response = api_client.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": escuadron.codigo_invitacion},
        format="json",
    )

    assert response.status_code == 401
    assert Membresia.objects.filter(escuadron=escuadron).count() == 1


@pytest.mark.django_db
def test_join_escuadron_with_valid_code_adds_member(
    auth_joiner,
    creator,
    joiner,
    escuadron,
):
    response = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": "x8k9ql"},
        format="json",
    )

    assert response.status_code == 201
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
    assert response.data["codigo_invitacion"] == "X8K9QL"
    assert response.data["es_publico"] is False
    assert response.data["limite_miembros"] == 5
    assert response.data["creador_id"] == creator.pk
    assert {"usuario_id": creator.pk, "es_administrador": True} in response.data[
        "miembros"
    ]
    assert {"usuario_id": joiner.pk, "es_administrador": False} in response.data[
        "miembros"
    ]

    membresia = Membresia.objects.get(escuadron=escuadron, usuario=joiner)
    assert membresia.es_administrador is False
    assert Membresia.objects.filter(escuadron=escuadron).count() == 2


@pytest.mark.django_db
def test_join_escuadron_with_unknown_code_returns_404(auth_joiner, escuadron, joiner):
    response = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": "ZZZZZZ"},
        format="json",
    )

    assert response.status_code == 404
    assert response.data["detail"] == "No se ha encontrado un escuadrón con ese código"
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()
    assert Membresia.objects.filter(escuadron=escuadron).count() == 1


@pytest.mark.django_db
def test_join_escuadron_when_already_member_returns_409(
    auth_joiner,
    escuadron,
    joiner,
):
    first = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": escuadron.codigo_invitacion},
        format="json",
    )
    assert first.status_code == 201

    second = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": escuadron.codigo_invitacion},
        format="json",
    )

    assert second.status_code == 409
    assert second.data["detail"] == "Ya perteneces a este escuadrón"
    assert Membresia.objects.filter(escuadron=escuadron, usuario=joiner).count() == 1
    assert Membresia.objects.filter(escuadron=escuadron).count() == 2


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("codigo_invitacion", "expected_message"),
    [
        ("ABC", "El código de invitación debe tener 6 caracteres."),
        ("ABCDEFG", "El código de invitación debe tener 6 caracteres."),
        (
            "ABCDE!",
            "El código de invitación solo puede contener letras A-Z y dígitos.",
        ),
    ],
)
def test_join_escuadron_rejects_invalid_code_format(
    auth_joiner,
    escuadron,
    joiner,
    codigo_invitacion,
    expected_message,
):
    response = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": codigo_invitacion},
        format="json",
    )

    assert response.status_code == 400
    assert expected_message in response.data["codigo_invitacion"]
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()
    assert Membresia.objects.filter(escuadron=escuadron).count() == 1


@pytest.mark.django_db
def test_join_escuadron_rejects_blank_code(auth_joiner, escuadron, joiner):
    response = auth_joiner.post(
        reverse(JOIN_URL),
        {"codigo_invitacion": "   "},
        format="json",
    )

    assert response.status_code == 400
    assert "codigo_invitacion" in response.data
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_join_escuadron_rejects_missing_code(auth_joiner, escuadron, joiner):
    response = auth_joiner.post(reverse(JOIN_URL), {}, format="json")

    assert response.status_code == 400
    assert "codigo_invitacion" in response.data
    assert not Membresia.objects.filter(escuadron=escuadron, usuario=joiner).exists()


@pytest.mark.django_db
def test_join_escuadron_openapi_documents_code_validation_and_responses(api_client):
    response = api_client.get(reverse("schema"))

    assert response.status_code == 200
    operation = response.data["paths"]["/api/escuadrones/unirse/"]["post"]
    codigo = response.data["components"]["schemas"]["EscuadronJoin"]["properties"][
        "codigo_invitacion"
    ]

    assert operation["operationId"] == "unirseAUnEscuadron"
    assert operation["summary"] == "Unirse a un escuadrón"
    assert operation["tags"] == ["Escuadrones"]
    assert "se normalizan a mayúsculas" in operation["description"]
    assert codigo["minLength"] == 6
    assert codigo["maxLength"] == 6
    assert codigo["pattern"] == "^[A-Za-z0-9]{6}$"
    assert codigo["example"] == "X8K9QL"
    assert set(operation["responses"]) == {"201", "400", "401", "404", "409"}
    assert operation["responses"]["400"]["description"] == (
        "El código debe tener 6 caracteres alfanuméricos."
    )
    assert operation["responses"]["409"]["description"] == (
        "El usuario ya es miembro o el escuadrón alcanzó el límite."
    )
