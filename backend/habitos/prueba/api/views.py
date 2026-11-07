from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron
from habitos.models import RegistroDiario
from habitos.prueba.services import FotoInvalidaError, guardar_prueba_foto
from habitos.services.assignment import (
    MembershipNotFoundError,
    get_habito_diario,
    get_membership,
)

from .serializers import (
    ErrorDetallePruebaFotoSerializer,
    ErrorValidacionPruebaFotoSerializer,
    PruebaFotoSerializer,
    PruebaFotoUploadSerializer,
)


class _PruebaFotoMembershipMixin:
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get_membership(self, request, escuadron_id):
        get_object_or_404(Escuadron, pk=escuadron_id)
        try:
            return get_membership(
                escuadron_id=escuadron_id,
                usuario=request.user,
            )
        except MembershipNotFoundError as error:
            raise PermissionDenied(
                "El usuario no pertenece a este escuadrón."
            ) from error


class PruebaFotoUploadView(_PruebaFotoMembershipMixin, APIView):
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
        membership = self.get_membership(request, escuadron_id)
        habit = get_habito_diario(membership)
        if habit is None:
            return Response(
                {
                    "detail": (
                        "Debes asignar tu hábito diario en este escuadrón "
                        "antes de subir una foto."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PruebaFotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        foto = serializer.validated_data["foto"]

        try:
            registro, created = guardar_prueba_foto(habito=habit, foto=foto)
        except FotoInvalidaError as error:
            return Response(
                {"foto": [str(error)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registro = RegistroDiario.objects.select_related(
            "habito__membresia",
        ).get(pk=registro.pk)
        payload = PruebaFotoSerializer.from_registro(registro)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(payload, status=status_code)


class PruebaFotoDetailView(_PruebaFotoMembershipMixin, APIView):
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
        self.get_membership(request, escuadron_id)
        registro = (
            RegistroDiario.objects.select_related("habito__membresia")
            .filter(
                pk=registro_id,
                habito__membresia__escuadron_id=escuadron_id,
            )
            .first()
        )
        if registro is None:
            raise NotFound("No se ha encontrado esa prueba de foto.")
        return Response(PruebaFotoSerializer.from_registro(registro))
