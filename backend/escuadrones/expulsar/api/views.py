from django.http import Http404
from drf_spectacular.utils import extend_schema
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


class ExpulsarMiembroView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(request=None, responses={204: None})
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
