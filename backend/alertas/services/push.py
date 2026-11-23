import json
from collections.abc import Callable
from datetime import datetime
from typing import Any

from django.conf import settings
from django.utils import timezone
from pywebpush import WebPushException, webpush

from alertas.models import SuscripcionPush
from alertas.services.eligibility import usuario_debe_recibir_aviso
from usuarios.models import CustomUser

# Contenido fijo de la notificación; el contrato solo fija cuándo se envía.
_PAYLOAD = json.dumps(
    {
        "title": "HabitSquad",
        "body": "Todavía no has subido la prueba de hoy.",
    },
    ensure_ascii=False,
)

WebPushSender = Callable[..., Any]


def _vapid_listo() -> tuple[str, dict[str, str]] | None:
    """Devuelve (clave_privada, claims) o None si falta configuración."""
    private_key = (settings.VAPID_PRIVATE_KEY or "").strip()
    public_key = (settings.VAPID_PUBLIC_KEY or "").strip()
    admin = (settings.VAPID_ADMIN_EMAIL or "").strip()
    if not private_key or not public_key or not admin:
        return None
    if admin.startswith(("mailto:", "http://", "https://")):
        sub = admin
    else:
        sub = f"mailto:{admin}"
    return private_key, {"sub": sub}


def _enviar_a_suscripcion(
    suscripcion: SuscripcionPush,
    *,
    vapid_private_key: str,
    vapid_claims: dict[str, str],
    webpush_fn: WebPushSender,
) -> bool:
    try:
        webpush_fn(
            subscription_info={
                "endpoint": suscripcion.endpoint,
                "keys": {
                    "p256dh": suscripcion.p256dh,
                    "auth": suscripcion.auth,
                },
            },
            data=_PAYLOAD,
            vapid_private_key=vapid_private_key,
            vapid_claims=vapid_claims,
        )
    except WebPushException:
        return False
    return True


def enviar_aviso_a_usuario(
    usuario,
    *,
    ahora: datetime | None = None,
    webpush_fn: WebPushSender = webpush,
) -> int:
    """Envía el aviso a las suscripciones del usuario si cumple el criterio.

    Devuelve el número de envíos correctos. Si no debe avisarse o faltan
    claves VAPID, no envía nada (0).
    """
    if not usuario_debe_recibir_aviso(usuario, ahora=ahora):
        return 0

    vapid = _vapid_listo()
    if vapid is None:
        return 0
    private_key, claims = vapid

    enviados = 0
    for suscripcion in SuscripcionPush.objects.filter(usuario=usuario):
        if _enviar_a_suscripcion(
            suscripcion,
            vapid_private_key=private_key,
            vapid_claims=claims,
            webpush_fn=webpush_fn,
        ):
            enviados += 1
    return enviados


def procesar_avisos_pendientes(
    *,
    ahora: datetime | None = None,
    webpush_fn: WebPushSender = webpush,
) -> int:
    """Evalúa usuarios con hora_aviso en el minuto actual y envía si procede."""
    momento = timezone.localtime(ahora) if ahora is not None else timezone.localtime()
    candidatos = CustomUser.objects.filter(
        hora_aviso__hour=momento.hour,
        hora_aviso__minute=momento.minute,
        suscripciones_push__isnull=False,
    ).distinct()

    total = 0
    for usuario in candidatos:
        total += enviar_aviso_a_usuario(
            usuario,
            ahora=ahora,
            webpush_fn=webpush_fn,
        )
    return total
