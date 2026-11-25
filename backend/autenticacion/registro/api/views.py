from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from .serializers import (
    ErrorValidacionRegistroSerializer,
    UserRegistrationRequestSerializer,
    UserRegistrationResponseSerializer,
    UserRegistrationSerializer,
)

_DESCRIPCION_REGISTRO = (
    "Registra una cuenta con email, contraseña, confirmación de contraseña y "
    "nickname único. La respuesta 201 devuelve id, email, nickname y "
    "date_joined, sin tokens. Tras verificar el email, la sesión JWT se "
    "obtiene con POST /api/auth/token/. Contrato: docs/REGISTRO.md."
)


class UserRegistrationView(generics.CreateAPIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (AnonRateThrottle,)
    serializer_class = UserRegistrationSerializer

    @extend_schema(
        request=UserRegistrationRequestSerializer,
        responses={
            201: OpenApiResponse(
                response=UserRegistrationResponseSerializer,
                description=(
                    "Cuenta creada. Hay que verificar el email antes de iniciar sesión."
                ),
            ),
            400: OpenApiResponse(
                response=ErrorValidacionRegistroSerializer,
                description=(
                    "Datos inválidos: email o nickname duplicados, "
                    "contraseñas que no coinciden u otros errores de campo."
                ),
            ),
            429: OpenApiResponse(
                description="Se ha superado el límite de solicitudes."
            ),
        },
        description=_DESCRIPCION_REGISTRO,
        examples=[
            OpenApiExample(
                "Alta correcta",
                value={
                    "id": 1,
                    "email": "persona@example.com",
                    "nickname": "HabitHero",
                    "date_joined": "2026-11-16T19:00:00.000000Z",
                },
                response_only=True,
                status_codes=["201"],
            ),
            OpenApiExample(
                "Email duplicado",
                value={"email": ["Ya existe una cuenta con este email."]},
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Nickname duplicado",
                value={"nickname": ["Ya existe una cuenta con este nickname."]},
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Contraseñas distintas",
                value={"password_confirm": ["Las contraseñas no coinciden."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
