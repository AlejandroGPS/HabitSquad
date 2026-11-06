from __future__ import annotations

import cloudinary.uploader
import cloudinary.utils
from django.utils import timezone

from habitos.models import HabitoDiario, RegistroDiario

# Tipos y tamaño acordados para la foto de prueba de hábito diario
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)
MAX_FOTO_BYTES = 5 * 1024 * 1024
CLOUDINARY_FOLDER = "pruebas"
# La imagen no es pública, hace falta una URL con firma para verla
CLOUDINARY_ACCESS_TYPE = "private"
SIGNED_URL_EXPIRES_SECONDS = 3600


class FotoInvalidaError(Exception):
    """La foto no cumple el tipo o el tamaño permitidos."""


def validate_foto(foto) -> None:
    if foto is None:
        raise FotoInvalidaError("No se ha enviado ninguna imagen.")

    content_type = (getattr(foto, "content_type", None) or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise FotoInvalidaError(
            "La imagen debe ser JPEG, PNG o WebP.",
        )

    size = getattr(foto, "size", None)
    if size is None:
        raise FotoInvalidaError("No se ha podido comprobar el tamaño de la imagen.")
    if size > MAX_FOTO_BYTES:
        raise FotoInvalidaError("La imagen no puede superar 5 MB.")


def _upload_private_image(foto) -> str:
    result = cloudinary.uploader.upload(
        foto,
        folder=CLOUDINARY_FOLDER,
        resource_type="image",
        type=CLOUDINARY_ACCESS_TYPE,
        use_filename=True,
        unique_filename=True,
        overwrite=False,
    )
    public_id = result.get("public_id")
    if not public_id:
        raise RuntimeError("Cloudinary no devolvió la referencia de la imagen.")
    return public_id


def build_signed_foto_url(cloudinary_public_id: str) -> str:
    """Devuelve una URL temporal firmada para ver la foto privada."""
    url, _ = cloudinary.utils.cloudinary_url(
        cloudinary_public_id,
        resource_type="image",
        type=CLOUDINARY_ACCESS_TYPE,
        sign_url=True,
        secure=True,
        expires_at=int(timezone.now().timestamp()) + SIGNED_URL_EXPIRES_SECONDS,
    )
    return url


def guardar_prueba_foto(
    *,
    habito: HabitoDiario,
    foto,
) -> tuple[RegistroDiario, bool]:
    """
    Sube la foto y crea o actualiza el registro del día (zona Europe/Madrid).

    Devuelve (registro, creado). Si ya había registro ese día, se actualiza
    la foto y el estado vuelve a pendiente.
    """
    validate_foto(foto)
    public_id = _upload_private_image(foto)
    # El “día” de la prueba sigue el huso horario de la aplicación
    fecha = timezone.localdate()

    registro, created = RegistroDiario.objects.update_or_create(
        habito=habito,
        fecha=fecha,
        defaults={
            "cloudinary_public_id": public_id,
            "estado": RegistroDiario.Estado.PENDIENTE,
        },
    )
    return registro, created
