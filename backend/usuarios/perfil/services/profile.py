from __future__ import annotations

from habitos.prueba.services import build_signed_foto_url
from usuarios.models import CustomUser


def serialize_perfil(user: CustomUser) -> dict:
    """Arma el cuerpo público del perfil según docs/PERFIL_USUARIO.md."""
    foto_url = None
    if user.foto_perfil_public_id:
        foto_url = build_signed_foto_url(user.foto_perfil_public_id)

    return {
        "id": user.pk,
        "email": user.email,
        "nickname": user.nickname,
        "foto_url": foto_url,
        "email_pendiente": user.email_pendiente,
        "hora_aviso": user.hora_aviso.strftime("%H:%M"),
    }
