from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron, Membresia
from escuadrones.tiempo_real.events import programar_actualizacion_panel

from .serializers import EscuadronConfiguracionSerializer


class EscuadronConfiguracionView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    def _get_admin_squad(self, escuadron_id, usuario):
        escuadron = get_object_or_404(Escuadron, pk=escuadron_id)
        es_administrador = Membresia.objects.filter(
            escuadron=escuadron,
            usuario=usuario,
            es_administrador=True,
        ).exists()
        if not es_administrador:
            raise PermissionDenied(
                "Solo el administrador puede consultar o modificar la configuración."
            )
        return escuadron

    @extend_schema(
        operation_id="consultarConfiguracionEscuadron",
        tags=["Escuadrones"],
        summary="Consultar configuración de un escuadrón",
        responses={
            200: EscuadronConfiguracionSerializer,
            401: OpenApiResponse(description="Falta un access token válido."),
            403: OpenApiResponse(description="El usuario no es administrador."),
            404: OpenApiResponse(description="El escuadrón no existe."),
        },
    )
    def get(self, request, escuadron_id):
        escuadron = self._get_admin_squad(escuadron_id, request.user)
        return Response(EscuadronConfiguracionSerializer(escuadron).data)

    @extend_schema(
        operation_id="actualizarConfiguracionEscuadron",
        tags=["Escuadrones"],
        summary="Actualizar configuración de un escuadrón",
        request=EscuadronConfiguracionSerializer(partial=True),
        responses={
            200: EscuadronConfiguracionSerializer,
            400: OpenApiResponse(
                description="Los datos de configuración no son válidos."
            ),
            401: OpenApiResponse(description="Falta un access token válido."),
            403: OpenApiResponse(description="El usuario no es administrador."),
            404: OpenApiResponse(description="El escuadrón no existe."),
        },
    )
    def patch(self, request, escuadron_id):
        escuadron = self._get_admin_squad(escuadron_id, request.user)
        serializer = EscuadronConfiguracionSerializer(
            escuadron,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        programar_actualizacion_panel(
            escuadron_id=escuadron.pk,
            motivo="configuracion_actualizada",
        )
        return Response(serializer.data)
