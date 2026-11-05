from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import (
    ErrorDetallePruebaFotoSerializer,
    ErrorValidacionPruebaFotoSerializer,
    PruebaFotoSerializer,
    PruebaFotoUploadSerializer,
)

_STUB_DETAIL = {
    "detail": (
        "Endpoint documentado en el contrato de API; la implementación está pendiente."
    ),
}


class PruebaFotoUploadView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    @extend_schema(
        operation_id="subirPruebaFoto",
        tags=["Pruebas"],
        summary="Subir foto de prueba diaria",
        request=PruebaFotoUploadSerializer,
        responses={
            201: OpenApiResponse(
                response=PruebaFotoSerializer,
                description="Primer registro del hábito para ese día.",
            ),
            200: OpenApiResponse(
                response=PruebaFotoSerializer,
                description=(
                    "Ya existía un registro del mismo hábito y día; se "
                    "actualiza la foto."
                ),
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPruebaFotoSerializer,
                description=(
                    "Falta la imagen, el tipo o tamaño no son válidos, o el "
                    "usuario no tiene hábito diario en el escuadrón."
                ),
            ),
            401: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            403: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description="El usuario no pertenece a este escuadrón.",
            ),
            404: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description="El escuadrón no existe.",
            ),
        },
        description=(
            "Sube la foto de prueba del hábito diario del usuario autenticado "
            "en un escuadrón. Requiere pertenencia al escuadrón y hábito "
            "asignado. El cuerpo es multipart/form-data con el campo foto. "
            "La fecha es el día actual en Europe/Madrid y el estado inicial "
            "es pendiente. Si ya hay registro ese día, se actualiza la foto."
        ),
        examples=[
            OpenApiExample(
                "Respuesta de carga",
                value={
                    "id": 1,
                    "habito_id": 10,
                    "usuario_id": 7,
                    "fecha": "2026-11-05",
                    "estado": "pendiente",
                    "foto_url": (
                        "https://res.cloudinary.com/ejemplo/image/upload/"
                        "s--firma--/v1/pruebas/abc123.jpg"
                    ),
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Foto no enviada",
                value={"foto": ["No se ha enviado ninguna imagen."]},
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Sin hábito asignado",
                value={
                    "detail": (
                        "Debes asignar tu hábito diario en este escuadrón "
                        "antes de subir una foto."
                    )
                },
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "No miembro",
                value={"detail": "El usuario no pertenece a este escuadrón."},
                response_only=True,
                status_codes=["403"],
            ),
        ],
    )
    def post(self, request, escuadron_id):
        del request, escuadron_id
        return Response(_STUB_DETAIL, status=status.HTTP_501_NOT_IMPLEMENTED)


class PruebaFotoDetailView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="visualizarPruebaFoto",
        tags=["Pruebas"],
        summary="Visualizar foto de prueba diaria",
        responses={
            200: OpenApiResponse(
                response=PruebaFotoSerializer,
                description=(
                    "Metadatos del registro y URL firmada o temporal de la foto."
                ),
            ),
            401: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            403: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description="El usuario no pertenece a este escuadrón.",
            ),
            404: OpenApiResponse(
                response=ErrorDetallePruebaFotoSerializer,
                description=(
                    "El escuadrón no existe, el registro no existe, o no "
                    "pertenece a un hábito de ese escuadrón."
                ),
            ),
        },
        description=(
            "Devuelve los metadatos de una prueba fotográfica y una URL "
            "firmada o temporal de la imagen. Cualquier miembro del "
            "escuadrón puede visualizarla. No emite ni registra votos."
        ),
        examples=[
            OpenApiExample(
                "Prueba encontrada",
                value={
                    "id": 1,
                    "habito_id": 10,
                    "usuario_id": 7,
                    "fecha": "2026-11-05",
                    "estado": "pendiente",
                    "foto_url": (
                        "https://res.cloudinary.com/ejemplo/image/upload/"
                        "s--firma--/v1/pruebas/abc123.jpg"
                    ),
                },
                response_only=True,
                status_codes=["200"],
            ),
            OpenApiExample(
                "Prueba no encontrada",
                value={"detail": "No se ha encontrado esa prueba de foto."},
                response_only=True,
                status_codes=["404"],
            ),
        ],
    )
    def get(self, request, escuadron_id, registro_id):
        del request, escuadron_id, registro_id
        return Response(_STUB_DETAIL, status=status.HTTP_501_NOT_IMPLEMENTED)
