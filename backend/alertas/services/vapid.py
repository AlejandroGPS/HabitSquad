from django.conf import settings


class VapidNoConfiguradoError(Exception):
    """Falta la clave pública VAPID en el entorno del servidor."""


def obtener_clave_publica_vapid() -> str:
    """Devuelve la clave pública VAPID o falla si no está configurada."""
    public_key = (settings.VAPID_PUBLIC_KEY or "").strip()
    if not public_key:
        raise VapidNoConfiguradoError("La clave pública VAPID no está configurada.")
    return public_key
