from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron, Membresia
from habitos.models import RegistroDiario

from .serializers import EscuadronDetalleSerializer


class EscuadronDetailView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="consultarDetalleEscuadron",
        tags=["Escuadrones"],
        summary="Consultar detalle de un escuadrón",
        responses={
            200: OpenApiResponse(
                response=EscuadronDetalleSerializer,
                description="Detalle del escuadrón con los hábitos de sus miembros.",
            ),
            401: OpenApiResponse(
                description="Falta el access token, es inválido o ha expirado."
            ),
            403: OpenApiResponse(
                description="El usuario no pertenece a este escuadrón."
            ),
            404: OpenApiResponse(description="El escuadrón no existe."),
        },
        description=(
            "Devuelve el escuadrón, los hábitos y las pruebas de hoy de sus miembros. "
            "Los miembros que todavía no tienen hábito incluyen «habito: null»."
        ),
    )
    def get(self, request, escuadron_id):
        escuadron = get_object_or_404(
            Escuadron.objects.prefetch_related(
                "membresias__usuario",
                Prefetch(
                    "membresias__habito_diario__registros_diarios",
                    queryset=RegistroDiario.objects.filter(fecha=timezone.localdate()),
                    to_attr="pruebas_hoy",
                ),
            ),
            pk=escuadron_id,
        )
        if not Membresia.objects.filter(
            escuadron=escuadron,
            usuario=request.user,
        ).exists():
            raise PermissionDenied("El usuario no pertenece a este escuadrón.")
        return Response(
            EscuadronDetalleSerializer(escuadron, context={"request": request}).data
        )
