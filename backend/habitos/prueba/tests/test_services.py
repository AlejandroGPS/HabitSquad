from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from habitos.prueba.services import (
    FotoInvalidaError,
    build_signed_foto_url,
    guardar_prueba_foto,
    validate_foto,
)
from habitos.prueba.services.upload import (
    CLOUDINARY_ACCESS_TYPE,
    MAX_FOTO_BYTES,
)
from usuarios.models import CustomUser


@pytest.fixture
def member(db):
    return CustomUser.objects.create_user(
        email="miembro@example.com",
        password="S0mething!Secure-497",
    )


@pytest.fixture
def habit(member):
    escuadron = Escuadron.objects.create(
        nombre="Madrugadores",
        creador=member,
        codigo_invitacion="X8K9QL",
    )
    membresia = Membresia.objects.create(
        escuadron=escuadron,
        usuario=member,
        es_administrador=True,
    )
    return HabitoDiario.objects.create(
        membresia=membresia,
        opcion=HabitoDiario.Opcion.LEER,
    )


def _foto(*, name="prueba.jpg", content=b"fake-image", content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@pytest.mark.parametrize(
    "content_type",
    ["image/jpeg", "image/png", "image/webp"],
)
def test_validate_foto_accepts_allowed_types(content_type):
    validate_foto(_foto(content_type=content_type))


def test_validate_foto_rejects_missing_file():
    with pytest.raises(FotoInvalidaError, match="No se ha enviado ninguna imagen"):
        validate_foto(None)


def test_validate_foto_rejects_invalid_mime():
    with pytest.raises(FotoInvalidaError, match="JPEG, PNG o WebP"):
        validate_foto(_foto(name="x.gif", content_type="image/gif"))


def test_validate_foto_rejects_file_too_large():
    foto = _foto()
    foto.size = MAX_FOTO_BYTES + 1

    with pytest.raises(FotoInvalidaError, match="5 MB"):
        validate_foto(foto)


def test_validate_foto_rejects_missing_size():
    class FotoSinTamano:
        content_type = "image/jpeg"

    with pytest.raises(
        FotoInvalidaError,
        match="No se ha podido comprobar el tamaño de la imagen",
    ):
        validate_foto(FotoSinTamano())


@pytest.mark.django_db
def test_guardar_prueba_foto_creates_pending_registro(habit):
    with patch(
        "habitos.prueba.services.upload.cloudinary.uploader.upload",
        return_value={"public_id": "pruebas/mock_foto_1"},
    ) as upload_mock:
        registro, created = guardar_prueba_foto(habito=habit, foto=_foto())

    assert created is True
    assert registro.estado == RegistroDiario.Estado.PENDIENTE
    assert registro.cloudinary_public_id == "pruebas/mock_foto_1"
    assert registro.fecha == timezone.localdate()
    assert upload_mock.call_args.kwargs["type"] == CLOUDINARY_ACCESS_TYPE
    assert upload_mock.call_args.kwargs["resource_type"] == "image"
    assert RegistroDiario.objects.filter(habito=habit).count() == 1


@pytest.mark.django_db
def test_guardar_prueba_foto_updates_same_day_registro(habit):
    with patch(
        "habitos.prueba.services.upload.cloudinary.uploader.upload",
        return_value={"public_id": "pruebas/mock_foto_1"},
    ):
        primero, created_first = guardar_prueba_foto(habito=habit, foto=_foto())

    with patch(
        "habitos.prueba.services.upload.cloudinary.uploader.upload",
        return_value={"public_id": "pruebas/mock_foto_2"},
    ):
        segundo, created_second = guardar_prueba_foto(
            habito=habit,
            foto=_foto(name="otra.png", content_type="image/png"),
        )

    assert created_first is True
    assert created_second is False
    assert segundo.pk == primero.pk
    assert segundo.cloudinary_public_id == "pruebas/mock_foto_2"
    assert segundo.estado == RegistroDiario.Estado.PENDIENTE
    assert RegistroDiario.objects.filter(habito=habit).count() == 1


@pytest.mark.django_db
def test_guardar_prueba_foto_raises_when_cloudinary_omits_public_id(habit):
    with (
        patch(
            "habitos.prueba.services.upload.cloudinary.uploader.upload",
            return_value={},
        ),
        pytest.raises(
            RuntimeError,
            match="Cloudinary no devolvió la referencia de la imagen",
        ),
    ):
        guardar_prueba_foto(habito=habit, foto=_foto())

    assert not RegistroDiario.objects.filter(habito=habit).exists()


def test_build_signed_foto_url_requests_private_signed_url():
    signed = "https://res.cloudinary.com/demo/image/private/s--x--/pruebas/mock"

    with patch(
        "habitos.prueba.services.upload.cloudinary.utils.cloudinary_url",
        return_value=(signed, {"signed": True}),
    ) as url_mock:
        url = build_signed_foto_url("pruebas/mock")

    assert url == signed
    assert url_mock.call_args.kwargs["sign_url"] is True
    assert url_mock.call_args.kwargs["type"] == CLOUDINARY_ACCESS_TYPE
    assert url_mock.call_args.kwargs["resource_type"] == "image"
    assert url_mock.call_args.kwargs["secure"] is True
