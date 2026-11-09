from datetime import date
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from habitos.validacion.services import VotoInvalidoError
from usuarios.models import CustomUser


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def author(db):
    return CustomUser.objects.create_user(
        email="autor-api@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def voter(db):
    return CustomUser.objects.create_user(
        email="votante-api@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def voter2(db):
    return CustomUser.objects.create_user(
        email="votante2-api@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def voter3(db):
    return CustomUser.objects.create_user(
        email="votante3-api@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def outsider(db):
    return CustomUser.objects.create_user(
        email="ajeno-api@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def squad(author, voter, voter2, voter3):
    """4 miembros → 3 elegibles sobre la prueba del autor, mayoría con 2 sí."""
    squad = Escuadron.objects.create(
        nombre="API Votos",
        creador=author,
        codigo_invitacion="AP1V0T",
    )
    for usuario, admin in [
        (author, True),
        (voter, False),
        (voter2, False),
        (voter3, False),
    ]:
        Membresia.objects.create(
            escuadron=squad,
            usuario=usuario,
            es_administrador=admin,
        )
    return squad


@pytest.fixture
def registro(squad, author):
    habit = HabitoDiario.objects.create(
        membresia=Membresia.objects.get(escuadron=squad, usuario=author),
        opcion=HabitoDiario.Opcion.LEER,
    )
    return RegistroDiario.objects.create(
        habito=habit,
        cloudinary_public_id="pruebas/voto-api",
        fecha=date(2026, 11, 8),
        estado=RegistroDiario.Estado.PENDIENTE,
    )


def votos_url(squad, registro):
    return reverse(
        "habitos:validacion:votos-prueba",
        kwargs={
            "escuadron_id": squad.pk,
            "registro_id": registro.pk,
        },
    )


def auth_client(api_client, user):
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_post_voto_requires_authentication(api_client, squad, registro):
    response = api_client.post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_post_voto_rejects_non_member(api_client, squad, registro, outsider):
    response = auth_client(api_client, outsider).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 403
    assert response.data["detail"] == "El usuario no pertenece a este escuadrón."


@pytest.mark.django_db
def test_post_voto_rejects_unknown_registro(api_client, squad, voter):
    response = auth_client(api_client, voter).post(
        reverse(
            "habitos:validacion:votos-prueba",
            kwargs={"escuadron_id": squad.pk, "registro_id": 999999},
        ),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 404
    assert response.data["detail"] == "No se ha encontrado esa prueba de foto."


@pytest.mark.django_db
def test_post_voto_rejects_unknown_squad(api_client, registro, voter):
    response = auth_client(api_client, voter).post(
        reverse(
            "habitos:validacion:votos-prueba",
            kwargs={"escuadron_id": 999999, "registro_id": registro.pk},
        ),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_post_voto_rejects_invalid_value(api_client, squad, registro, voter):
    response = auth_client(api_client, voter).post(
        votos_url(squad, registro),
        {"voto": "maybe"},
        format="json",
    )

    assert response.status_code == 400
    assert "voto" in response.data


@pytest.mark.django_db
def test_post_voto_maps_voto_invalido_from_service(
    api_client,
    squad,
    registro,
    voter,
):
    # El serializer ya filtra valores raros, esta rama cubre VotoInvalidoError
    with patch(
        "habitos.validacion.api.views.emitir_voto",
        side_effect=VotoInvalidoError('Debe ser "sí" o "no".'),
    ):
        response = auth_client(api_client, voter).post(
            votos_url(squad, registro),
            {"voto": "sí"},
            format="json",
        )

    assert response.status_code == 400
    assert response.data["voto"] == ['Debe ser "sí" o "no".']


@pytest.mark.django_db
def test_post_voto_rejects_autovoto(api_client, squad, registro, author):
    response = auth_client(api_client, author).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 400
    assert "propia prueba" in response.data["detail"]


@pytest.mark.django_db
def test_post_voto_creates_and_returns_recuento(api_client, squad, registro, voter):
    response = auth_client(api_client, voter).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["registro_id"] == registro.pk
    assert response.data["votos_si"] == 1
    assert response.data["votantes_elegibles"] == 3
    assert response.data["votos_emitidos"] == 1
    assert response.data["mayoria_alcanzada"] is False
    assert response.data["voto_propio"] == "sí"
    assert response.data["estado"] == RegistroDiario.Estado.PENDIENTE


@pytest.mark.django_db
def test_post_voto_rejects_duplicate(api_client, squad, registro, voter):
    client = auth_client(api_client, voter)
    assert (
        client.post(
            votos_url(squad, registro),
            {"voto": "sí"},
            format="json",
        ).status_code
        == 201
    )

    response = client.post(
        votos_url(squad, registro),
        {"voto": "no"},
        format="json",
    )

    assert response.status_code == 409
    assert response.data["detail"] == "Ya has emitido un voto sobre esta prueba."


@pytest.mark.django_db
def test_post_voto_mayoria_pasa_a_cumplido(
    api_client,
    squad,
    registro,
    voter,
    voter2,
):
    assert (
        auth_client(api_client, voter)
        .post(votos_url(squad, registro), {"voto": "sí"}, format="json")
        .status_code
        == 201
    )

    response = auth_client(APIClient(), voter2).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["votos_si"] == 2
    assert response.data["mayoria_alcanzada"] is True
    assert response.data["estado"] == RegistroDiario.Estado.CUMPLIDO
    registro.refresh_from_db()
    assert registro.estado == RegistroDiario.Estado.CUMPLIDO


@pytest.mark.django_db
def test_post_voto_rejects_closed_registro(
    api_client,
    squad,
    registro,
    voter,
    voter2,
    voter3,
):
    auth_client(api_client, voter).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )
    auth_client(APIClient(), voter2).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    response = auth_client(APIClient(), voter3).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    assert response.status_code == 400
    assert "cerrada" in response.data["detail"]


@pytest.mark.django_db
def test_get_votacion_requires_authentication(api_client, squad, registro):
    response = api_client.get(votos_url(squad, registro))

    assert response.status_code == 401


@pytest.mark.django_db
def test_get_votacion_rejects_non_member(api_client, squad, registro, outsider):
    response = auth_client(api_client, outsider).get(votos_url(squad, registro))

    assert response.status_code == 403


@pytest.mark.django_db
def test_get_votacion_rejects_unknown_registro(api_client, squad, voter):
    response = auth_client(api_client, voter).get(
        reverse(
            "habitos:validacion:votos-prueba",
            kwargs={"escuadron_id": squad.pk, "registro_id": 999999},
        )
    )

    assert response.status_code == 404
    assert response.data["detail"] == "No se ha encontrado esa prueba de foto."


@pytest.mark.django_db
def test_get_votacion_returns_estado_sin_voto_propio(
    api_client,
    squad,
    registro,
    voter,
    voter2,
):
    auth_client(api_client, voter).post(
        votos_url(squad, registro),
        {"voto": "sí"},
        format="json",
    )

    response = auth_client(APIClient(), voter2).get(votos_url(squad, registro))

    assert response.status_code == 200
    assert response.data["votos_si"] == 1
    assert response.data["voto_propio"] is None
    assert response.data["votos_emitidos"] == 1


@pytest.mark.django_db
def test_get_votacion_returns_voto_propio_tras_votar(
    api_client,
    squad,
    registro,
    voter,
):
    url = votos_url(squad, registro)
    client = auth_client(api_client, voter)
    client.post(url, {"voto": "no"}, format="json")

    response = client.get(url)

    assert response.status_code == 200
    assert response.data["voto_propio"] == "no"
    assert response.data["votos_si"] == 0
