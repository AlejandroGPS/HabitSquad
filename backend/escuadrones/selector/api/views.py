from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.crear.api.views import EscuadronCreateView
from escuadrones.models import Escuadron

from .serializers import EscuadronSelectorSerializer


class EscuadronSelectorView(EscuadronCreateView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listarEscuadronesUsuario",
        tags=["Escuadrones"],
        summary="Listar escuadrones del usuario",
        responses={
            200: OpenApiResponse(
                response=EscuadronSelectorSerializer(many=True),
                description="Escuadrones a los que pertenece el usuario autenticado.",
            ),
            401: OpenApiResponse(
                description="Falta el access token, es inválido o ha expirado."
            ),
        },
        description=(
            "Devuelve los escuadrones del usuario autenticado junto con sus "
            "miembros y hábitos diarios. Si no pertenece a ningún escuadrón, "
            "devuelve una lista vacía."
        ),
    )
    def get(self, request):
        escuadrones = (
            Escuadron.objects.filter(membresias__usuario=request.user)
            .prefetch_related("membresias__habito_diario")
            .distinct()
        )
        return Response(EscuadronSelectorSerializer(escuadrones, many=True).data)
