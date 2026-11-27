from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.unirse.services.join import (
    AlreadyMemberError,
    PrivateSquadError,
    SquadronFullError,
    SquadronNotFoundError,
    unirse_escuadron_publico,
)

from .serializers import (
    Conflict,
    ErrorDetalleSerializer,
    ErrorValidacionCodigoInvitacionSerializer,
    EscuadronJoinSerializer,
    PrivateSquad,
    SquadronFull,
)


class EscuadronJoinView(generics.CreateAPIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)
    serializer_class = EscuadronJoinSerializer

    @extend_schema(
        operation_id="unirseAUnEscuadron",
        tags=["Escuadrones"],
        summary="Unirse a un escuadrón",
        request=EscuadronJoinSerializer,
        responses={
            201: OpenApiResponse(
                response=EscuadronJoinSerializer,
                description="El usuario queda unido al escuadrón como miembro.",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionCodigoInvitacionSerializer,
                description="El código debe tener 6 caracteres alfanuméricos.",
            ),
            401: OpenApiResponse(
                response=ErrorDetalleSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            404: OpenApiResponse(
                response=ErrorDetalleSerializer,
                description="No existe un escuadrón con ese código de invitación.",
            ),
            409: OpenApiResponse(
                response=ErrorDetalleSerializer,
                description=(
                    "El usuario ya es miembro o el escuadrón alcanzó el límite."
                ),
            ),
        },
        description=(
            "Une al usuario autenticado a un escuadrón mediante un código de "
            "invitación de 6 caracteres alfanuméricos. Se aceptan minúsculas, "
            "que se normalizan a mayúsculas. Queda como miembro no administrador. "
            "Si ya pertenece al escuadrón, la operación responde 409."
        ),
        examples=[
            OpenApiExample(
                "Código válido",
                value={"codigo_invitacion": "X8K9QL"},
                request_only=True,
            ),
            OpenApiExample(
                "Formato no válido",
                value={
                    "codigo_invitacion": [
                        "El código de invitación debe tener 6 caracteres."
                    ]
                },
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Código desconocido",
                value={"detail": "No se ha encontrado un escuadrón con ese código"},
                response_only=True,
                status_codes=["404"],
            ),
            OpenApiExample(
                "Ya es miembro",
                value={"detail": "Ya perteneces a este escuadrón"},
                response_only=True,
                status_codes=["409"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class PublicSquadJoinView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="unirseAUnEscuadronPublico",
        tags=["Escuadrones"],
        request=None,
        summary="Unirse a un escuadrón público",
        parameters=[
            OpenApiParameter(
                name="escuadron_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Identificador del escuadrón público.",
            )
        ],
        responses={
            201: OpenApiResponse(
                response=EscuadronJoinSerializer,
                description="El usuario queda unido como miembro no administrador.",
            ),
            401: OpenApiResponse(description="Falta un access token válido."),
            403: OpenApiResponse(description="El escuadrón es privado."),
            404: OpenApiResponse(description="El escuadrón no existe."),
            409: OpenApiResponse(
                description="El usuario ya es miembro o se alcanzó el límite."
            ),
        },
        description=(
            "Incorpora al usuario autenticado a un escuadrón público sin código. "
            "El usuario no debe pertenecer ya al escuadrón y este debe tener "
            "plazas disponibles."
        ),
    )
    def post(self, request, escuadron_id):
        try:
            escuadron = unirse_escuadron_publico(
                escuadron_id=escuadron_id,
                usuario=request.user,
            )
        except SquadronNotFoundError as error:
            raise NotFound(detail=str(error)) from error
        except AlreadyMemberError as error:
            raise Conflict(detail=str(error)) from error
        except SquadronFullError as error:
            raise SquadronFull(detail=str(error)) from error
        except PrivateSquadError as error:
            raise PrivateSquad(detail=str(error)) from error

        return Response(
            EscuadronJoinSerializer(escuadron).data,
            status=status.HTTP_201_CREATED,
        )
