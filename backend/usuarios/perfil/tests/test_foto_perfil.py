from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from usuarios.models import CustomUser

SIGNED_URL = "https://res.cloudinary.com/demo/image/private/s--x--/v1/perfiles/mock.jpg"


def _foto(*, name="perfil.jpg", content=b"fake-image", content_type="image/jpeg"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="perfil@example.com",
        password="S0mething!Secure-497",
        nickname="PerfilUser",
    )


@pytest.fixture
def auth_client(api_client, user):
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


@pytest.mark.django_db
def test_post_foto_perfil_uploads_and_returns_signed_url(auth_client, user):
    with (
        patch(
            "usuarios.perfil.services.photo.cloudinary.uploader.upload",
            return_value={"public_id": "perfiles/mock_foto_1"},
        ) as upload_mock,
        patch(
            "usuarios.perfil.services.photo.build_signed_foto_url",
            return_value=SIGNED_URL,
        ),
    ):
        response = auth_client.post(
            reverse("perfil:foto"),
            {"foto": _foto()},
            format="multipart",
        )

    user.refresh_from_db()
    assert response.status_code == 200
    assert response.data == {"foto_url": SIGNED_URL}
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
            return_value=SIGNED_URL,
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
    assert "foto" in response.data
    assert not upload_mock.called
    assert user.foto_perfil_public_id is None


@pytest.mark.django_db
def test_guardar_foto_perfil_raises_when_cloudinary_omits_public_id(user):
    from usuarios.perfil.services import guardar_foto_perfil

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
