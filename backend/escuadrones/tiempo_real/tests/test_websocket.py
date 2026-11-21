import asyncio
import json

import pytest
from asgiref.sync import async_to_sync
from asgiref.testing import ApplicationCommunicator
from channels.layers import get_channel_layer
from django.test import override_settings
from rest_framework_simplejwt.tokens import AccessToken

from config.asgi import application
from escuadrones.models import Escuadron, Membresia
from escuadrones.tiempo_real.consumers import SincronizacionEscuadronConsumer
from usuarios.models import CustomUser

_CAPA_EN_MEMORIA = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


@pytest.fixture
def usuarios_y_escuadron(db):
    miembro = CustomUser.objects.create_user(
        email="miembro-ws@example.com",
        password="S0mething!Secure-497",
    )
    externo = CustomUser.objects.create_user(
        email="externo-ws@example.com",
        password="S0mething!Secure-497",
    )
    escuadron = Escuadron.objects.create(
        nombre="Conectados",
        creador=miembro,
        codigo_invitacion="W8S9QL",
    )
    Membresia.objects.create(
        escuadron=escuadron,
        usuario=miembro,
        es_administrador=True,
    )
    return miembro, externo, escuadron


def token(usuario):
    return str(AccessToken.for_user(usuario))


def scope(escuadron_id):
    return {
        "type": "websocket",
        "path": f"/ws/escuadrones/{escuadron_id}/",
        "headers": [],
    }


@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS=_CAPA_EN_MEMORIA)
def test_miembro_autenticado_recibe_actualizaciones_del_escuadron(
    usuarios_y_escuadron,
):
    miembro, _, escuadron = usuarios_y_escuadron
    otro_miembro = CustomUser.objects.create_user(
        email="otro-miembro-ws@example.com",
        password="S0mething!Secure-497",
    )
    Membresia.objects.create(
        escuadron=escuadron,
        usuario=otro_miembro,
        es_administrador=False,
    )

    async def flujo():
        comunicadores = []
        autenticaciones = []
        for usuario in (miembro, otro_miembro):
            comunicador = ApplicationCommunicator(application, scope(escuadron.pk))
            await comunicador.send_input({"type": "websocket.connect"})
            aceptacion = await comunicador.receive_output(timeout=2)
            await comunicador.send_input(
                {
                    "type": "websocket.receive",
                    "text": json.dumps(
                        {"tipo": "autenticar", "access": token(usuario)}
                    ),
                }
            )
            autenticaciones.append(
                (aceptacion, await comunicador.receive_output(timeout=2))
            )
            comunicadores.append(comunicador)
        datos = {
            "tipo": "panel.actualizado",
            "escuadron_id": escuadron.pk,
            "motivo": "prueba_actualizada",
            "registro_id": 45,
        }
        await get_channel_layer().group_send(
            f"escuadron_{escuadron.pk}",
            {"type": "panel.actualizado", "datos": datos},
        )
        eventos = []
        for comunicador in comunicadores:
            eventos.append(await comunicador.receive_output(timeout=2))
            await comunicador.send_input(
                {"type": "websocket.disconnect", "code": 1000}
            )
            await comunicador.wait(timeout=2)
        return autenticaciones, eventos

    autenticaciones, eventos = async_to_sync(flujo)()

    assert all(
        aceptacion["type"] == "websocket.accept"
        for aceptacion, _ in autenticaciones
    )
    assert all(
        json.loads(autenticado["text"])
        == {"tipo": "autenticado", "escuadron_id": escuadron.pk}
        for _, autenticado in autenticaciones
    )
    assert [json.loads(evento["text"]) for evento in eventos] == [
        {
            "tipo": "panel.actualizado",
            "escuadron_id": escuadron.pk,
            "motivo": "prueba_actualizada",
            "registro_id": 45,
        },
        {
            "tipo": "panel.actualizado",
            "escuadron_id": escuadron.pk,
            "motivo": "prueba_actualizada",
            "registro_id": 45,
        },
    ]


@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS=_CAPA_EN_MEMORIA)
@pytest.mark.parametrize(
    "credencial",
    ["ausente", "invalido", "token_externo", "usuario_inactivo"],
)
def test_websocket_rechaza_token_invalido_o_usuario_no_miembro(
    usuarios_y_escuadron,
    credencial,
):
    _, externo, escuadron = usuarios_y_escuadron
    if credencial == "usuario_inactivo":
        externo.is_active = False
        externo.save(update_fields=["is_active"])
    access = {
        "ausente": None,
        "invalido": "no-es-un-jwt",
        "token_externo": token(externo),
        "usuario_inactivo": token(externo),
    }[credencial]

    async def flujo():
        comunicador = ApplicationCommunicator(application, scope(escuadron.pk))
        await comunicador.send_input({"type": "websocket.connect"})
        await comunicador.receive_output(timeout=2)
        await comunicador.send_input(
            {
                "type": "websocket.receive",
                "text": json.dumps({"tipo": "autenticar", "access": access}),
            }
        )
        cierre = await comunicador.receive_output(timeout=2)
        await comunicador.send_input({"type": "websocket.disconnect", "code": 4401})
        await comunicador.wait(timeout=2)
        return cierre

    cierre = async_to_sync(flujo)()

    assert cierre == {"type": "websocket.close", "code": 4401}


@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS=_CAPA_EN_MEMORIA)
def test_websocket_rechaza_primer_mensaje_que_no_sea_autenticacion(
    usuarios_y_escuadron,
):
    _, _, escuadron = usuarios_y_escuadron

    async def flujo():
        comunicador = ApplicationCommunicator(application, scope(escuadron.pk))
        await comunicador.send_input({"type": "websocket.connect"})
        await comunicador.receive_output(timeout=2)
        await comunicador.send_input(
            {"type": "websocket.receive", "text": json.dumps(["incorrecto"])}
        )
        cierre = await comunicador.receive_output(timeout=2)
        await comunicador.send_input({"type": "websocket.disconnect", "code": 4401})
        await comunicador.wait(timeout=2)
        return cierre

    assert async_to_sync(flujo)() == {"type": "websocket.close", "code": 4401}


@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS=_CAPA_EN_MEMORIA)
def test_websocket_no_acepta_mensajes_de_cliente_tras_autenticar(
    usuarios_y_escuadron,
):
    miembro, _, escuadron = usuarios_y_escuadron

    async def flujo():
        comunicador = ApplicationCommunicator(application, scope(escuadron.pk))
        await comunicador.send_input({"type": "websocket.connect"})
        await comunicador.receive_output(timeout=2)
        await comunicador.send_input(
            {
                "type": "websocket.receive",
                "text": json.dumps({"tipo": "autenticar", "access": token(miembro)}),
            }
        )
        await comunicador.receive_output(timeout=2)
        await comunicador.send_input(
            {
                "type": "websocket.receive",
                "text": json.dumps({"tipo": "falso_evento"}),
            }
        )
        cierre = await comunicador.receive_output(timeout=2)
        await comunicador.send_input({"type": "websocket.disconnect", "code": 4400})
        await comunicador.wait(timeout=2)
        return cierre

    assert async_to_sync(flujo)() == {"type": "websocket.close", "code": 4400}


@pytest.mark.django_db(transaction=True)
@override_settings(CHANNEL_LAYERS=_CAPA_EN_MEMORIA)
def test_websocket_cierra_conexiones_no_autenticadas_por_timeout(
    usuarios_y_escuadron,
):
    _, _, escuadron = usuarios_y_escuadron

    async def flujo():
        comunicador = ApplicationCommunicator(application, scope(escuadron.pk))
        await comunicador.send_input({"type": "websocket.connect"})
        await comunicador.receive_output(timeout=2)
        cierre = await comunicador.receive_output(timeout=6)
        await comunicador.send_input({"type": "websocket.disconnect", "code": 4401})
        await comunicador.wait(timeout=2)
        return cierre

    assert async_to_sync(flujo)() == {"type": "websocket.close", "code": 4401}


def test_timeout_no_cierra_una_conexion_ya_autenticada(monkeypatch):
    consumidor = SincronizacionEscuadronConsumer()
    consumidor.usuario = object()
    cerrado = False

    async def no_esperar(_segundos):
        return None

    async def registrar_cierre(**_kwargs):
        nonlocal cerrado
        cerrado = True

    monkeypatch.setattr(asyncio, "sleep", no_esperar)
    monkeypatch.setattr(consumidor, "close", registrar_cierre)
    async_to_sync(consumidor._cerrar_si_no_se_autentica)()

    assert cerrado is False
