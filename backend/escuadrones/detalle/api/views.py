from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.detalle.services import ResumenEscuadron
from escuadrones.models import Escuadron, Membresia
from habitos.models import RegistroDiario

from .serializers import EscuadronDetalleSerializer

_CONTRATO = "Contrato: docs/HABITOS.md (panel del escuadrón)."


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
                description=(
                    "Detalle del escuadrón con nickname, foto_url, hábitos y "
                    "pruebas de sus miembros."
                ),
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
            "Devuelve el escuadrón, nickname y foto de perfil de cada miembro, "
            "sus hábitos y las pruebas de hoy. Los miembros sin hábito incluyen "
            "«habito: null»; sin prueba hoy, «prueba_hoy: null». «racha» cuenta "
            "los días seguidos en que todos los miembros cumplieron; hoy suma si "
            "ya está cumplido. «semana» da el estado de la prueba de cada "
            f"miembro de lunes a domingo, o null si no hay prueba ese día. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Panel con miembros",
                value={
                    "id": 1,
                    "nombre": "Madrugadores",
                    "codigo_invitacion": "X8K9QL",
                    "creador_id": 42,
                    "racha": 2,
                    "miembros": [
                        {
                            "usuario_id": 42,
                            "es_administrador": True,
                            "es_usuario": True,
                            "nickname": "HabitHero",
                            "foto_url": (
                                "https://res.cloudinary.com/ejemplo/image/upload/"
                                "s--firma--/v1/perfiles/abc123.jpg"
                            ),
                            "habito": None,
                            "prueba_hoy": None,
                            "semana": [
                                {"fecha": "2026-11-16", "estado": None},
                                {"fecha": "2026-11-17", "estado": "cumplido"},
                            ],
                        },
                        {
                            "usuario_id": 7,
                            "es_administrador": False,
                            "es_usuario": False,
                            "nickname": "LectorPro",
                            "foto_url": None,
                            "habito": {
                                "id": 1,
                                "opcion": "otro",
                                "texto_personalizado": "Leer 20 páginas",
                                "creado_en": "2026-11-02T10:00:00Z",
                                "actualizado_en": "2026-11-02T10:05:00Z",
                            },
                            "prueba_hoy": {"id": 15, "estado": "pendiente"},
                            "semana": [
                                {"fecha": "2026-11-16", "estado": None},
                                {"fecha": "2026-11-21", "estado": "pendiente"},
                            ],
                        },
                    ],
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
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
        resumen = ResumenEscuadron(escuadron, escuadron.membresias.all())
        return Response(
            EscuadronDetalleSerializer(
                escuadron,
                context={"request": request, "resumen": resumen},
            ).data
        )
