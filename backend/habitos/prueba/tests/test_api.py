from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser

SIGNED_URL = "https://res.cloudinary.com/demo/image/private/s--x--/v1/pruebas/mock.jpg"


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
def outsider(db):
    return CustomUser.objects.create_user(
        email="ajeno@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def squad(creator):
    squad = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=creator,
        codigo_invitacion="X8K9QL",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=creator,
        es_administrador=True,
    )
    return squad


@pytest.fixture
def membership(squad, member):
    return Membresia.objects.create(
        escuadron=squad,
        usuario=member,
        es_administrador=False,
    )


@pytest.fixture
def habit(membership):
    return HabitoDiario.objects.create(
        membresia=membership,
        opcion=HabitoDiario.Opcion.LEER,
    )


@pytest.fixture
def member_client(api_client, member, membership, habit):
    del membership, habit
    token = AccessToken.for_user(member)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


def upload_url(squad):
    return reverse(
        "habitos:prueba:subir-prueba-foto",
        kwargs={"escuadron_id": squad.pk},
    )


def _foto(*, name="prueba.jpg", content=b"fake", content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@pytest.mark.django_db
def test_post_prueba_requires_authentication(api_client, squad):
    response = api_client.post(
        upload_url(squad),
        {"foto": _foto()},
        format="multipart",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_post_prueba_rejects_non_member(api_client, squad, outsider):
    token = AccessToken.for_user(outsider)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    response = api_client.post(
        upload_url(squad),
        {"foto": _foto()},
        format="multipart",
    )

    assert response.status_code == 403
    assert response.data["detail"] == "El usuario no pertenece a este escuadrón."


@pytest.mark.django_db
def test_post_prueba_rejects_unknown_squad(member_client):
    response = member_client.post(
        reverse(
            "habitos:prueba:subir-prueba-foto",
            kwargs={"escuadron_id": 99999},
        ),
        {"foto": _foto()},
        format="multipart",
    )

    assert response.status_code == 404


@pytest.mark.django_db
def test_post_prueba_rejects_member_without_habit(
    api_client,
    squad,
    creator,
):
    token = AccessToken.for_user(creator)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    response = api_client.post(
        upload_url(squad),
        {"foto": _foto()},
        format="multipart",
    )

    assert response.status_code == 400
    assert response.data["detail"] == (
        "Debes asignar tu hábito diario en este escuadrón antes de subir una foto."
    )


@pytest.mark.django_db
def test_post_prueba_rejects_invalid_mime(member_client, squad, habit):
    del habit
    with patch(
        "habitos.prueba.services.upload.cloudinary.uploader.upload",
    ) as upload_mock:
        response = member_client.post(
            upload_url(squad),
            {"foto": _foto(name="x.gif", content_type="image/gif")},
            format="multipart",
        )

    assert response.status_code == 400
    assert "foto" in response.data
    assert not upload_mock.called
    assert not RegistroDiario.objects.exists()


@pytest.mark.django_db
def test_post_prueba_creates_registro_with_mocked_cloudinary(
    member_client,
    squad,
    member,
    habit,
):
    with (
        patch(
            "habitos.prueba.services.upload.cloudinary.uploader.upload",
            return_value={"public_id": "pruebas/mock_foto_1"},
        ) as upload_mock,
        patch(
            "habitos.prueba.services.upload.cloudinary.utils.cloudinary_url",
            return_value=(SIGNED_URL, {}),
        ),
    ):
        response = member_client.post(
            upload_url(squad),
            {"foto": _foto()},
            format="multipart",
        )

    assert response.status_code == 201
    assert response.data["habito_id"] == habit.pk
    assert response.data["usuario_id"] == member.pk
    assert response.data["estado"] == "pendiente"
    assert response.data["fecha"] == timezone.localdate()
    assert response.data["foto_url"] == SIGNED_URL
    assert upload_mock.call_args.kwargs["type"] == "private"

    registro = RegistroDiario.objects.get(pk=response.data["id"])
    assert registro.cloudinary_public_id == "pruebas/mock_foto_1"
    assert registro.estado == RegistroDiario.Estado.PENDIENTE
    assert RegistroDiario.objects.filter(habito=habit).count() == 1


@pytest.mark.django_db
def test_post_prueba_updates_same_day_registro(
    member_client,
    squad,
    habit,
):
    with (
        patch(
            "habitos.prueba.services.upload.cloudinary.uploader.upload",
            return_value={"public_id": "pruebas/mock_foto_1"},
        ),
        patch(
            "habitos.prueba.services.upload.cloudinary.utils.cloudinary_url",
            return_value=(SIGNED_URL, {}),
        ),
    ):
        first = member_client.post(
            upload_url(squad),
            {"foto": _foto()},
            format="multipart",
        )

    with (
        patch(
            "habitos.prueba.services.upload.cloudinary.uploader.upload",
            return_value={"public_id": "pruebas/mock_foto_2"},
        ),
        patch(
            "habitos.prueba.services.upload.cloudinary.utils.cloudinary_url",
            return_value=(SIGNED_URL, {}),
        ),
    ):
        second = member_client.post(
            upload_url(squad),
            {"foto": _foto(name="otra.png", content_type="image/png")},
            format="multipart",
        )

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.data["id"] == first.data["id"]

    registro = RegistroDiario.objects.get(pk=first.data["id"])
    assert registro.cloudinary_public_id == "pruebas/mock_foto_2"
    assert RegistroDiario.objects.filter(habito=habit).count() == 1
