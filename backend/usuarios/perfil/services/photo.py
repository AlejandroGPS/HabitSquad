from __future__ import annotations

import cloudinary.uploader

from habitos.prueba.services.upload import (
    CLOUDINARY_ACCESS_TYPE,
    FotoInvalidaError,
    build_signed_foto_url,
    validate_foto,
)
from usuarios.models import CustomUser

CLOUDINARY_FOLDER = "perfiles"


def guardar_foto_perfil(*, user: CustomUser, foto) -> str:
    """
    Valida y sube la foto de perfil a Cloudinary.

    Guarda la referencia en el usuario y devuelve la URL firmada.
    """
    validate_foto(foto)
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

    user.foto_perfil_public_id = public_id
    user.save(update_fields=["foto_perfil_public_id"])
    return build_signed_foto_url(public_id)


__all__ = ["FotoInvalidaError", "guardar_foto_perfil"]
