from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from usuarios.models import CustomUser

from ..services.request import send_password_reset_email
from ..services.reset import reset_password
from .serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestResponseSerializer,
    PasswordResetRequestSerializer,
)


class PasswordResetRequestView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (AnonRateThrottle,)

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={
            200: PasswordResetRequestResponseSerializer,
            400: OpenApiResponse(description="El email no es válido."),
            429: OpenApiResponse(
                description="Se ha superado el límite de solicitudes."
            ),
        },
        description=(
            "Solicita la recuperación de contraseña. La respuesta es la misma "
            "tanto si el email está registrado como si no lo está."
        ),
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        user = CustomUser.objects.filter(
            email__iexact=email,
            is_active=True,
        ).first()
        if user is not None:
            send_password_reset_email(user=user)

        return Response(
            {
                "detail": (
                    "Si existe una cuenta asociada a ese email, "
                    "recibirás instrucciones para recuperar la contraseña."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (AnonRateThrottle,)

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={
            200: PasswordResetRequestResponseSerializer,
            400: OpenApiResponse(
                description="El token o la nueva contraseña no son válidos."
            ),
            429: OpenApiResponse(
                description="Se ha superado el límite de solicitudes."
            ),
        },
        description=(
            "Establece una nueva contraseña con un enlace válido. El enlace "
            "queda invalidado después de actualizar la contraseña."
        ),
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_password(
            uid=serializer.validated_data["uid"],
            token=serializer.validated_data["token"],
            password=serializer.validated_data["new_password"],
        )
        return Response(
            {"detail": "La contraseña se ha actualizado correctamente."},
            status=status.HTTP_200_OK,
        )
