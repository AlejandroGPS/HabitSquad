from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.detalle.services import ResumenEscuadron
from escuadrones.models import Escuadron

from .serializers import EscuadronPublicoSerializer


class EscuadronesPublicosView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="listarEscuadronesPublicos",
        tags=["Escuadrones"],
        summary="Listar escuadrones públicos",
        parameters=[
            OpenApiParameter(
                name="q",
                type=str,
                location=OpenApiParameter.QUERY,
                required=False,
                description=(
                    "Texto opcional para buscar por nombre con coincidencia "
                    "parcial, sin distinguir mayúsculas y minúsculas."
                ),
            )
        ],
        responses={
            200: EscuadronPublicoSerializer(many=True),
            401: OpenApiResponse(description="Falta un access token válido."),
        },
        description=(
            "Devuelve los escuadrones públicos a los que el usuario autenticado "
            "todavía no pertenece, con su racha, el número actual y el límite de "
            "miembros. El parámetro opcional q filtra por nombre."
        ),
    )
    def get(self, request):
        escuadrones = Escuadron.objects.filter(es_publico=True).exclude(
            membresias__usuario=request.user
        )
        nombre = request.query_params.get("q", "").strip()
        if nombre:
            escuadrones = escuadrones.filter(nombre__icontains=nombre)

        escuadrones = list(
            escuadrones.annotate(
                miembros_actuales=Count("membresias")
            ).prefetch_related("membresias")
        )
        for escuadron in escuadrones:
            escuadron.racha = ResumenEscuadron(
                escuadron,
                escuadron.membresias.all(),
            ).racha

        return Response(EscuadronPublicoSerializer(escuadrones, many=True).data)
