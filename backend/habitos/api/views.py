from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from escuadrones.models import Escuadron
from habitos.services.assignment import (
    MembershipNotFoundError,
    get_habito_diario,
    get_membership,
    save_habito_diario,
)

from .serializers import HabitoDiarioSerializer


class HabitoDiarioDetailView(APIView):
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

    @extend_schema(
        operation_id="consultarHabitoDiario",
        tags=["Hábitos"],
        summary="Consultar hábito diario",
        responses={
            200: OpenApiResponse(
                response=HabitoDiarioSerializer,
                description="Hábito diario configurado por el usuario.",
            ),
            401: OpenApiResponse(
                description="Falta el access token, es inválido o ha expirado."
            ),
            403: OpenApiResponse(
                description="El usuario no pertenece a este escuadrón."
            ),
            404: OpenApiResponse(
                description="El escuadrón no existe o todavía no tiene hábito."
            ),
        },
        description=(
            "Consulta el hábito diario del usuario autenticado dentro de un "
            "escuadrón al que pertenece."
        ),
    )
    def get(self, request, escuadron_id):
        membership = self.get_membership(request, escuadron_id)
        habit = get_habito_diario(membership)
        if habit is None:
            return Response(status=404)
        return Response(HabitoDiarioSerializer(habit).data)

    @extend_schema(
        operation_id="asignarHabitoDiario",
        tags=["Hábitos"],
        summary="Asignar hábito diario",
        request=HabitoDiarioSerializer,
        responses={
            200: OpenApiResponse(
                response=HabitoDiarioSerializer,
                description="Hábito diario creado o actualizado.",
            ),
            400: OpenApiResponse(
                description=(
                    "La opción no es válida, falta texto para «Otro» o el texto "
                    "supera los 255 caracteres."
                )
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
            "Crea o actualiza el único hábito diario del usuario en un "
            "escuadrón. Las opciones predefinidas son gimnasio, leer y "
            "estudiar; «Otro» requiere texto personalizado."
        ),
        examples=[
            OpenApiExample(
                "Opción predefinida",
                value={"opcion": "leer", "texto_personalizado": ""},
                request_only=True,
            ),
            OpenApiExample(
                "Hábito personalizado",
                value={
                    "opcion": "otro",
                    "texto_personalizado": "Leer 20 páginas",
                },
                request_only=True,
            ),
            OpenApiExample(
                "Otro sin texto",
                value={
                    "opcion": "otro",
                    "texto_personalizado": "",
                },
                request_only=True,
            ),
        ],
    )
    def put(self, request, escuadron_id):
        membership = self.get_membership(request, escuadron_id)
        serializer = HabitoDiarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        habit = save_habito_diario(
            membresia=membership,
            validated_data=serializer.validated_data,
        )
        return Response(HabitoDiarioSerializer(habit).data)
