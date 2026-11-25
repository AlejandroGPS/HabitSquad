from django.db.models import Count
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron

from .serializers import EscuadronPublicoSerializer


class EscuadronesPublicosView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listarEscuadronesPublicos",
        tags=["Escuadrones"],
        summary="Listar escuadrones públicos",
        responses={
            200: EscuadronPublicoSerializer(many=True),
            401: OpenApiResponse(description="Falta un access token válido."),
        },
        description=(
            "Devuelve los escuadrones públicos visibles para usuarios autenticados, "
            "con el número actual y el límite de miembros."
        ),
    )
    def get(self, request):
        escuadrones = Escuadron.objects.filter(es_publico=True).annotate(
            miembros_actuales=Count("membresias")
        )
        return Response(EscuadronPublicoSerializer(escuadrones, many=True).data)
