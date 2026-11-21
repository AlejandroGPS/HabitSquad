from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from habitos.prueba.services.upload import MAX_FOTO_BYTES
from usuarios.perfil.services import FotoInvalidaError, guardar_foto_perfil

from .conftest import SIGNED_FOTO_URL


def _foto(*, name="perfil.jpg", content=b"fake-image", content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@pytest.mark.django_db
def test_post_foto_perfil_requires_auth(api_client):
    response = api_client.post(
        reverse("perfil:foto"),
        {"foto": _foto()},
        format="multipart",
    )

    assert response.status_code == 401


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("name", "content_type"),
    [
        ("perfil.jpg", "image/jpeg"),
        ("perfil.png", "image/png"),
        ("perfil.webp", "image/webp"),
    ],
)
def test_post_foto_perfil_uploads_and_returns_signed_url(
    auth_client, user, name, content_type
):
    with (
        patch(
            "usuarios.perfil.services.photo.cloudinary.uploader.upload",
            return_value={"public_id": "perfiles/mock_foto_1"},
        ) as upload_mock,
        patch(
            "usuarios.perfil.services.photo.build_signed_foto_url",
            return_value=SIGNED_FOTO_URL,
        ),
    ):
        response = auth_client.post(
            reverse("perfil:foto"),
            {"foto": _foto(name=name, content_type=content_type)},
            format="multipart",
        )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {"foto_url": SIGNED_FOTO_URL}
    assert user.foto_perfil_public_id == "perfiles/mock_foto_1"
    assert upload_mock.call_args.kwargs["folder"] == "perfiles"
    assert upload_mock.call_args.kwargs["type"] == "private"


@pytest.mark.django_db
def test_post_foto_perfil_replaces_previous_public_id(auth_client, user):
    user.foto_perfil_public_id = "perfiles/old"
    user.save(update_fields=["foto_perfil_public_id"])

    with (
        patch(
            "usuarios.perfil.services.photo.cloudinary.uploader.upload",
            return_value={"public_id": "perfiles/new"},
        ),
        patch(
            "usuarios.perfil.services.photo.build_signed_foto_url",
            return_value=SIGNED_FOTO_URL,
        ),
    ):
        response = auth_client.post(
            reverse("perfil:foto"),
            {"foto": _foto()},
            format="multipart",
        )

    user.refresh_from_db()
    assert response.status_code == 200
    assert user.foto_perfil_public_id == "perfiles/new"


@pytest.mark.django_db
def test_post_foto_perfil_rejects_missing_file(auth_client):
    response = auth_client.post(reverse("perfil:foto"), {}, format="multipart")

    assert response.status_code == 400
    assert "foto" in response.data


@pytest.mark.django_db
def test_post_foto_perfil_rejects_invalid_type_without_upload(auth_client, user):
    with patch(
        "usuarios.perfil.services.photo.cloudinary.uploader.upload",
    ) as upload_mock:
        response = auth_client.post(
            reverse("perfil:foto"),
            {"foto": _foto(name="x.gif", content_type="image/gif")},
            format="multipart",
        )

    user.refresh_from_db()
    assert response.status_code == 400
    assert response.data["foto"] == ["La imagen debe ser JPEG, PNG o WebP."]
    assert not upload_mock.called
    assert user.foto_perfil_public_id is None


@pytest.mark.django_db
def test_guardar_foto_perfil_rejects_file_too_large_without_upload(user):
    foto = _foto()
    foto.size = MAX_FOTO_BYTES + 1

    with patch(
        "usuarios.perfil.services.photo.cloudinary.uploader.upload",
    ) as upload_mock:
        with pytest.raises(FotoInvalidaError, match="5 MB"):
            guardar_foto_perfil(user=user, foto=foto)

    user.refresh_from_db()
    assert not upload_mock.called
    assert user.foto_perfil_public_id is None


@pytest.mark.django_db
def test_guardar_foto_perfil_raises_when_cloudinary_omits_public_id(user):
    with (
        patch(
            "usuarios.perfil.services.photo.cloudinary.uploader.upload",
            return_value={},
        ),
        pytest.raises(
            RuntimeError,
            match="Cloudinary no devolvió la referencia de la imagen",
        ),
    ):
        guardar_foto_perfil(user=user, foto=_foto())

    user.refresh_from_db()
    assert user.foto_perfil_public_id is None
