from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    LoginRequestSerializer,
    TokenPairResponseSerializer,
    VerifiedEmailTokenSerializer,
)


@extend_schema_view(
    post=extend_schema(
        request=LoginRequestSerializer,
        responses={
            200: TokenPairResponseSerializer,
            401: OpenApiResponse(
                description=(
                    "Email o contraseña incorrectos, cuenta inactiva o email "
                    "pendiente de verificación."
                )
            ),
            429: OpenApiResponse(
                description="Se ha superado el límite de intentos de inicio de sesión."
            ),
        },
        description=(
            "Autentica con email y contraseña y devuelve access y refresh. "
            "El email debe estar verificado antes de establecer la sesión."
        ),
    )
)
class LoginView(TokenObtainPairView):
    serializer_class = VerifiedEmailTokenSerializer
    authentication_classes = ()
    permission_classes = (AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"
