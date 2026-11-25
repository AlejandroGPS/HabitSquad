import pytest
from django.db import IntegrityError

from alertas.models import SuscripcionPush
from usuarios.models import CustomUser


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="push@example.com",
        password="S0mething!Secure-497",
        nickname="PushUser",
    )


@pytest.mark.django_db
def test_crear_suscripcion_push(user):
    suscripcion = SuscripcionPush.objects.create(
        usuario=user,
        endpoint="https://fcm.googleapis.com/fcm/send/ejemplo",
        p256dh="clave-p256dh",
        auth="clave-auth",
    )

    assert suscripcion.pk is not None
    assert str(suscripcion).startswith(f"{user.pk}:")


@pytest.mark.django_db
def test_endpoint_es_unico(user):
    SuscripcionPush.objects.create(
        usuario=user,
        endpoint="https://fcm.googleapis.com/fcm/send/unico",
        p256dh="a",
        auth="b",
    )

    with pytest.raises(IntegrityError):
        SuscripcionPush.objects.create(
            usuario=user,
            endpoint="https://fcm.googleapis.com/fcm/send/unico",
            p256dh="c",
            auth="d",
        )
