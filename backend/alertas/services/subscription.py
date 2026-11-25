from alertas.models import SuscripcionPush


def registrar_suscripcion(
    *,
    usuario,
    endpoint: str,
    p256dh: str,
    auth: str,
) -> tuple[SuscripcionPush, bool]:
    """Crea o actualiza la suscripción identificada por endpoint.

    Devuelve (suscripcion, creado). Si el endpoint ya existía (mismo u otro
    usuario), actualiza claves y dueño; no dispara ningún envío.
    """
    suscripcion, creado = SuscripcionPush.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            "usuario": usuario,
            "p256dh": p256dh,
            "auth": auth,
        },
    )
    return suscripcion, creado


def eliminar_suscripcion(*, usuario, endpoint: str) -> None:
    """Elimina la suscripción del usuario. Idempotente si no existía."""
    SuscripcionPush.objects.filter(usuario=usuario, endpoint=endpoint).delete()
