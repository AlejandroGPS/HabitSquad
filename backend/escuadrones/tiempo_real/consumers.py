import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from escuadrones.models import Membresia


class SincronizacionEscuadronConsumer(AsyncJsonWebsocketConsumer):
    """Conexión de solo lectura para recibir cambios del panel del escuadrón."""

    async def connect(self):
        self.escuadron_id = self.scope["url_route"]["kwargs"]["escuadron_id"]
        self.grupo = f"escuadron_{self.escuadron_id}"
        self.usuario = None
        await self.accept()
        self.timeout_autenticacion = asyncio.create_task(
            self._cerrar_si_no_se_autentica()
        )

    async def disconnect(self, close_code):
        if self.usuario is not None:
            await self.channel_layer.group_discard(self.grupo, self.channel_name)
        self.timeout_autenticacion.cancel()

    async def receive_json(self, content, **kwargs):
        if self.usuario is not None:
            await self.close(code=4400)
            return

        if not isinstance(content, dict) or content.get("tipo") != "autenticar":
            await self.close(code=4401)
            return

        usuario = await self._obtener_miembro(content.get("access"))
        if usuario is None:
            await self.close(code=4401)
            return

        self.usuario = usuario
        self.timeout_autenticacion.cancel()
        await self.channel_layer.group_add(self.grupo, self.channel_name)
        await self.send_json(
            {"tipo": "autenticado", "escuadron_id": self.escuadron_id}
        )

    async def panel_actualizado(self, event):
        await self.send_json(event["datos"])

    async def _cerrar_si_no_se_autentica(self):
        await asyncio.sleep(5)
        if self.usuario is None:
            await self.close(code=4401)

    @database_sync_to_async
    def _obtener_miembro(self, token):
        if not isinstance(token, str) or not token:
            return None

        try:
            access_token = AccessToken(token)
            user_id = access_token["user_id"]
        except (TokenError, KeyError):
            return None

        usuario = get_user_model().objects.filter(pk=user_id, is_active=True).first()
        if usuario is None:
            return None

        if not Membresia.objects.filter(
            escuadron_id=self.escuadron_id,
            usuario=usuario,
        ).exists():
            return None

        return usuario
