from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
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
        responses={
            200: HabitoDiarioSerializer,
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
        description="Consulta el hábito diario del usuario en un escuadrón.",
    )
    def get(self, request, escuadron_id):
        membership = self.get_membership(request, escuadron_id)
        habit = get_habito_diario(membership)
        if habit is None:
            return Response(status=404)
        return Response(HabitoDiarioSerializer(habit).data)

    @extend_schema(
        request=HabitoDiarioSerializer,
        responses={
            200: HabitoDiarioSerializer,
            400: OpenApiResponse(description="Los datos enviados no son válidos."),
            401: OpenApiResponse(
                description="Falta el access token, es inválido o ha expirado."
            ),
            403: OpenApiResponse(
                description="El usuario no pertenece a este escuadrón."
            ),
            404: OpenApiResponse(description="El escuadrón no existe."),
        },
        description="Crea o actualiza el hábito diario del usuario.",
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
