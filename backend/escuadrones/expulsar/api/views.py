from django.http import Http404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.expulsar.services import (
    AdministradorNoExpulsableError,
    EscuadronNoEncontradoError,
    MiembroNoEncontradoError,
    SolicitanteNoAdministradorError,
    expulsar_miembro,
)

from .serializers import ErrorDetalleExpulsionSerializer


class ExpulsarMiembroView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="expulsarMiembroEscuadron",
        tags=["Escuadrones"],
        summary="Expulsar un miembro de un escuadrón",
        request=None,
        parameters=[
            OpenApiParameter(
                name="escuadron_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Identificador del escuadrón.",
            ),
            OpenApiParameter(
                name="usuario_id",
                type=int,
                location=OpenApiParameter.PATH,
                description="Identificador del miembro que se quiere expulsar.",
            ),
        ],
        responses={
            204: OpenApiResponse(
                description="Membresía eliminada; la respuesta no tiene cuerpo."
            ),
            401: OpenApiResponse(
                response=ErrorDetalleExpulsionSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
            403: OpenApiResponse(
                response=ErrorDetalleExpulsionSerializer,
                description=(
                    "El usuario solicitante no es administrador o el miembro "
                    "objetivo es administrador/creador."
                ),
            ),
            404: OpenApiResponse(
                response=ErrorDetalleExpulsionSerializer,
                description=(
                    "El escuadrón no existe o el usuario objetivo no pertenece a él."
                ),
            ),
        },
        description=(
            "Permite al administrador expulsar a un miembro no administrador "
            "del escuadrón. No se puede expulsar al administrador ni al creador. "
            "Se eliminan la membresía, sus datos relacionados y los votos del "
            "expulsado en otras pruebas del escuadrón."
        ),
    )
    def delete(self, request, escuadron_id, usuario_id):
        try:
            expulsar_miembro(
                escuadron_id=escuadron_id,
                usuario_id=usuario_id,
                solicitante=request.user,
            )
        except EscuadronNoEncontradoError as error:
            raise Http404(str(error)) from error
        except MiembroNoEncontradoError as error:
            raise Http404(str(error)) from error
        except SolicitanteNoAdministradorError as error:
            raise PermissionDenied(str(error)) from error
        except AdministradorNoExpulsableError as error:
            raise PermissionDenied(str(error)) from error

        return Response(status=status.HTTP_204_NO_CONTENT)
