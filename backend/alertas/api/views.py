from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import (
    ErrorDetalleAlertasSerializer,
    ErrorValidacionAlertasSerializer,
    SuscripcionCreateSerializer,
    SuscripcionDeleteSerializer,
    SuscripcionResponseSerializer,
    VapidPublicKeySerializer,
)

_CONTRATO = "Contrato: docs/ALERTAS.md."
_PENDIENTE = "Implementación pendiente: este stub solo documenta el contrato OpenAPI."


class VapidPublicKeyView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    @extend_schema(
        operation_id="obtenerClavePublicaVapid",
        tags=["Alertas"],
        summary="Obtener la clave pública VAPID",
        responses={
            200: OpenApiResponse(
                response=VapidPublicKeySerializer,
                description="Clave pública para suscribirse a Web Push.",
            ),
            503: OpenApiResponse(
                response=ErrorDetalleAlertasSerializer,
                description="La clave pública no está configurada en el servidor.",
            ),
        },
        description=(
            f"Devuelve la clave pública VAPID. Pública (sin JWT). {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Clave pública",
                value={"public_key": "BNcRdsa...ejemplo..."},
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        return Response(
            {"detail": _PENDIENTE},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


class SuscripcionView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="registrarSuscripcionWebPush",
        tags=["Alertas"],
        summary="Registrar o actualizar la suscripción Web Push",
        request=SuscripcionCreateSerializer,
        responses={
            201: OpenApiResponse(
                response=SuscripcionResponseSerializer,
                description="Suscripción creada.",
            ),
            200: OpenApiResponse(
                response=SuscripcionResponseSerializer,
                description="Suscripción actualizada (mismo endpoint).",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionAlertasSerializer,
                description="Body incompleto o campos vacíos / inválidos.",
            ),
            401: OpenApiResponse(
                response=ErrorDetalleAlertasSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Asocia la suscripción Web Push al usuario autenticado. "
            "Si ya existía el mismo endpoint, actualiza las claves. "
            f"No cambia hora_aviso ni dispara un envío. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Suscripción nueva",
                value={
                    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                    "creado": True,
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Endpoint obligatorio",
                value={"endpoint": ["Este campo es obligatorio."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": _PENDIENTE},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

    @extend_schema(
        operation_id="eliminarSuscripcionWebPush",
        tags=["Alertas"],
        summary="Eliminar la suscripción Web Push",
        request=SuscripcionDeleteSerializer,
        responses={
            204: OpenApiResponse(
                description="Suscripción eliminada (o ya inexistente).",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionAlertasSerializer,
                description="Falta endpoint o está vacío.",
            ),
            401: OpenApiResponse(
                response=ErrorDetalleAlertasSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Elimina la suscripción del usuario identificada por endpoint. "
            f"Idempotente: 204 también si no existía. {_CONTRATO}"
        ),
    )
    def delete(self, request, *args, **kwargs):
        return Response(
            {"detail": _PENDIENTE},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
