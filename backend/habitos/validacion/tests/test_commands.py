from datetime import date
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from escuadrones.models import Escuadron, Membresia
from habitos.models import HabitoDiario, RegistroDiario
from usuarios.models import CustomUser


@pytest.fixture
def registro_pendiente(db):
    author = CustomUser.objects.create_user(
        email="autor-cmd@example.com",
        password="S0mething!Secure-497",
    )
    squad = Escuadron.objects.create(
        nombre="Comando Cierre",
        creador=author,
        codigo_invitacion="CMD001",
    )
    Membresia.objects.create(
        escuadron=squad,
        usuario=author,
        es_administrador=True,
    )
    habit = HabitoDiario.objects.create(
        membresia=Membresia.objects.get(escuadron=squad, usuario=author),
        opcion=HabitoDiario.Opcion.LEER,
    )
    return RegistroDiario.objects.create(
        habito=habit,
        cloudinary_public_id="pruebas/comando-cierre",
        fecha=date(2026, 11, 8),
        estado=RegistroDiario.Estado.PENDIENTE,
    )


@pytest.mark.django_db
def test_cerrar_validaciones_diarias_con_fecha(registro_pendiente):
    out = StringIO()

    call_command(
        "cerrar_validaciones_diarias",
        "--fecha",
        "2026-11-08",
        stdout=out,
    )

    registro_pendiente.refresh_from_db()
    assert registro_pendiente.estado == RegistroDiario.Estado.NO_CUMPLIDO
    assert "1 registro(s) actualizado(s)" in out.getvalue()
    assert "2026-11-08" in out.getvalue()


@pytest.mark.django_db
def test_cerrar_validaciones_diarias_sin_fecha_usa_localdate(registro_pendiente):
    out = StringIO()
    hoy = registro_pendiente.fecha

    with patch(
        "habitos.validacion.services.closing.timezone.localdate",
        return_value=hoy,
    ):
        call_command("cerrar_validaciones_diarias", stdout=out)

    registro_pendiente.refresh_from_db()
    assert registro_pendiente.estado == RegistroDiario.Estado.NO_CUMPLIDO
    assert "hoy (Europe/Madrid)" in out.getvalue()
    assert "1 registro(s) actualizado(s)" in out.getvalue()


@pytest.mark.django_db
def test_cerrar_validaciones_diarias_fecha_invalida():
    with pytest.raises(CommandError, match="YYYY-MM-DD"):
        call_command("cerrar_validaciones_diarias", "--fecha", "08-11-2026")
