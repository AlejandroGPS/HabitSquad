from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron
from habitos.models import RegistroDiario
from habitos.services.assignment import MembershipNotFoundError, get_membership
from habitos.validacion.services import (
    AutovotoError,
    PruebaCerradaError,
    VotoDuplicadoError,
    VotoInvalidoError,
    emitir_voto,
    obtener_estado_votacion,
)

from .serializers import (
    EmitirVotoSerializer,
    ErrorDetalleValidacionSerializer,
    ErrorValidacionVotoSerializer,
    EstadoVotacionSerializer,
)

# Ejemplo de respuesta alineado con docs/VALIDACION_HABITO.md
_EJEMPLO_ESTADO_VOTACION = {
    "registro_id": 1,
    "estado": "pendiente",
    "votos_si": 1,
    "votantes_elegibles": 3,
    "votos_emitidos": 1,
    "mayoria_alcanzada": False,
    "voto_propio": "sí",
    "votos": [
        {
            "usuario_id": 7,
            "voto": "sí",
        }
    ],
}


class ValidacionVotoView(APIView):
    """Emisión y consulta de votos de validación sobre una prueba de foto."""

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

    def get_registro(self, escuadron_id, registro_id) -> RegistroDiario:
        registro = (
            RegistroDiario.objects.select_related("habito__membresia")
            .prefetch_related("votos")
            .filter(
                pk=registro_id,
                habito__membresia__escuadron_id=escuadron_id,
            )
            .first()
        )
        if registro is None:
            raise NotFound("No se ha encontrado esa prueba de foto.")
        return registro

    @extend_schema(
        operation_id="emitirVotoValidacion",
        tags=["Validacion"],
        summary="Emitir voto sobre una prueba de foto",
        request=EmitirVotoSerializer,
        responses={
            201: OpenApiResponse(
                response=EstadoVotacionSerializer,
                description=(
                    "Primer (y único) voto del usuario autenticado sobre esa "
                    "prueba, con recuento y estado recalculados."
                ),
            ),
            400: OpenApiResponse(
                response=ErrorValidacionVotoSerializer,
                description=("Voto inválido, autovoto, o la prueba ya está cerrada."),
            ),
            401: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            403: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description="El usuario no pertenece a este escuadrón.",
            ),
            404: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description=(
                    "El escuadrón no existe, el registro no existe, o no "
                    "pertenece a un hábito de ese escuadrón."
                ),
            ),
            409: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description="El usuario ya ha emitido un voto sobre esa prueba.",
            ),
        },
        description=(
            "Registra el voto «sí» o «no» del usuario autenticado sobre una "
            "foto de prueba ajena. Requiere pertenencia al escuadrón. No "
            "permite autovoto ni segundo voto. Si votos_si supera la mitad "
            "de los votantes elegibles, el registro pasa a cumplido. "
            "Contrato: docs/VALIDACION_HABITO.md."
        ),
        examples=[
            OpenApiExample(
                "Voto emitido",
                value=_EJEMPLO_ESTADO_VOTACION,
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Voto inválido",
                value={"voto": ['Debe ser "sí" o "no".']},
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Autovoto",
                value={
                    "detail": (
                        "No puedes votar tu propia prueba de foto de hábito diario."
                    )
                },
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Prueba cerrada",
                value={
                    "detail": ("Esta prueba ya está cerrada y no admite más votos.")
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
            OpenApiExample(
                "Prueba no encontrada",
                value={"detail": "No se ha encontrado esa prueba de foto."},
                response_only=True,
                status_codes=["404"],
            ),
            OpenApiExample(
                "Voto duplicado",
                value={"detail": "Ya has emitido un voto sobre esta prueba."},
                response_only=True,
                status_codes=["409"],
            ),
        ],
    )
    def post(self, request, escuadron_id, registro_id):
        self.get_membership(request, escuadron_id)
        registro = self.get_registro(escuadron_id, registro_id)

        serializer = EmitirVotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        voto = serializer.validated_data["voto"]

        try:
            payload = emitir_voto(
                registro=registro,
                usuario=request.user,
                voto=voto,
            )
        except AutovotoError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PruebaCerradaError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except VotoInvalidoError as error:
            return Response(
                {"voto": [str(error)]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except VotoDuplicadoError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(payload, status=status.HTTP_201_CREATED)

    @extend_schema(
        operation_id="consultarEstadoVotacion",
        tags=["Validacion"],
        summary="Consultar estado de votación de una prueba",
        responses={
            200: OpenApiResponse(
                response=EstadoVotacionSerializer,
                description=(
                    "Recuento, votos emitidos y estado del registro, sin "
                    "modificar la votación."
                ),
            ),
            401: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            403: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description="El usuario no pertenece a este escuadrón.",
            ),
            404: OpenApiResponse(
                response=ErrorDetalleValidacionSerializer,
                description=(
                    "El escuadrón no existe, el registro no existe, o no "
                    "pertenece a un hábito de ese escuadrón."
                ),
            ),
        },
        description=(
            "Devuelve el estado de votación de una prueba fotográfica para "
            "cualquier miembro del escuadrón. No emite ni modifica votos. "
            "Contrato: docs/VALIDACION_HABITO.md."
        ),
        examples=[
            OpenApiExample(
                "Estado de votación",
                value={
                    **_EJEMPLO_ESTADO_VOTACION,
                    "votos_emitidos": 2,
                    "voto_propio": None,
                    "votos": [
                        {"usuario_id": 7, "voto": "sí"},
                        {"usuario_id": 9, "voto": "no"},
                    ],
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
        registro = self.get_registro(escuadron_id, registro_id)
        payload = obtener_estado_votacion(
            registro=registro,
            usuario=request.user,
        )
        return Response(payload, status=status.HTTP_200_OK)
