from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from usuarios.perfil.services import serialize_perfil

from .serializers import (
    ErrorDetallePerfilSerializer,
    ErrorValidacionPerfilSerializer,
    PerfilEmailChangeRequestSerializer,
    PerfilEmailChangeResponseSerializer,
    PerfilEmailConfirmRequestSerializer,
    PerfilEmailConfirmResponseSerializer,
    PerfilFotoResponseSerializer,
    PerfilFotoUploadSerializer,
    PerfilPasswordChangeRequestSerializer,
    PerfilPasswordChangeResponseSerializer,
    PerfilUsuarioSerializer,
    PerfilUsuarioUpdateSerializer,
)

_CONTRATO = "Contrato: docs/PERFIL_USUARIO.md."

_RESPUESTA_NO_IMPLEMENTADA = {
    "detail": "Endpoint de perfil documentado; implementación pendiente.",
}


class PerfilDetailView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="consultarPerfil",
        tags=["Perfil"],
        summary="Consultar el perfil del usuario autenticado",
        responses={
            200: OpenApiResponse(
                response=PerfilUsuarioSerializer,
                description="Perfil actual, con foto_url firmada o null.",
            ),
            401: OpenApiResponse(
                response=ErrorDetallePerfilSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Devuelve id, email, nickname, foto_url, email_pendiente y "
            f"hora_aviso del usuario autenticado. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Perfil con foto",
                value={
                    "id": 1,
                    "email": "persona@example.com",
                    "nickname": "HabitHero",
                    "foto_url": (
                        "https://res.cloudinary.com/ejemplo/image/upload/"
                        "s--firma--/v1/perfiles/abc123.jpg"
                    ),
                    "email_pendiente": None,
                    "hora_aviso": "20:00",
                },
                response_only=True,
                status_codes=["200"],
            ),
        ],
    )
    def get(self, request, *args, **kwargs):
        return Response(serialize_perfil(request.user), status=status.HTTP_200_OK)

    @extend_schema(
        operation_id="actualizarPerfil",
        tags=["Perfil"],
        summary="Actualizar nickname y/o hora de aviso",
        request=PerfilUsuarioUpdateSerializer,
        responses={
            200: OpenApiResponse(
                response=PerfilUsuarioSerializer,
                description="Perfil actualizado (misma forma que GET).",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPerfilSerializer,
                description=(
                    "Ningún campo; nickname vacío o en uso; hora_aviso inválida."
                ),
            ),
            401: OpenApiResponse(
                response=ErrorDetallePerfilSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Actualización parcial: nickname y/o hora_aviso. Si el nickname "
            "está en uso o la hora no es HH:MM, responde 400 y conserva los "
            f"valores actuales. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Nickname duplicado",
                value={"nickname": ["Ya existe una cuenta con este nickname."]},
                response_only=True,
                status_codes=["400"],
            ),
            OpenApiExample(
                "Hora inválida",
                value={"hora_aviso": ["Indica la hora en formato HH:MM."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def patch(self, request, *args, **kwargs):
        serializer = PerfilUsuarioUpdateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(serialize_perfil(user), status=status.HTTP_200_OK)


class PerfilFotoUploadView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    @extend_schema(
        operation_id="subirFotoPerfil",
        tags=["Perfil"],
        summary="Subir o actualizar la foto de perfil",
        request=PerfilFotoUploadSerializer,
        responses={
            200: OpenApiResponse(
                response=PerfilFotoResponseSerializer,
                description="Foto guardada; foto_url firmada o temporal.",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPerfilSerializer,
                description="Falta foto, MIME no permitido o fichero > 5 MB.",
            ),
            401: OpenApiResponse(
                response=ErrorDetallePerfilSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Multipart con campo foto (JPEG, PNG o WebP, máx. 5 MB). "
            "Reemplaza la foto anterior del usuario. Misma idea de "
            f"almacenamiento que la prueba diaria. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Foto actualizada",
                value={
                    "foto_url": (
                        "https://res.cloudinary.com/ejemplo/image/upload/"
                        "s--firma--/v1/perfiles/abc123.jpg"
                    ),
                },
                response_only=True,
                status_codes=["200"],
            ),
            OpenApiExample(
                "Sin imagen",
                value={"foto": ["No se ha enviado ninguna imagen."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return Response(
            _RESPUESTA_NO_IMPLEMENTADA, status=status.HTTP_501_NOT_IMPLEMENTED
        )


class PerfilEmailChangeView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="solicitarCambioEmailPerfil",
        tags=["Perfil"],
        summary="Solicitar cambio de correo",
        request=PerfilEmailChangeRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=PerfilEmailChangeResponseSerializer,
                description=(
                    "Correo pendiente registrado; se envía enlace a la nueva "
                    "dirección. El login sigue con el email actual."
                ),
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPerfilSerializer,
                description="Email inválido, igual al actual o ya registrado.",
            ),
            401: OpenApiResponse(
                response=ErrorDetallePerfilSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Solicita un correo nuevo. Si está libre, queda como "
            "email_pendiente y se envía verificación; el email de login no "
            f"cambia hasta confirmar. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Solicitud aceptada",
                value={
                    "detail": (
                        "Si la dirección es válida, recibirás un enlace de "
                        "verificación en el nuevo correo."
                    ),
                    "email_pendiente": "nuevo@example.com",
                },
                response_only=True,
                status_codes=["200"],
            ),
            OpenApiExample(
                "Email ya registrado",
                value={"email": ["Ya existe una cuenta con este email."]},
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return Response(
            _RESPUESTA_NO_IMPLEMENTADA, status=status.HTTP_501_NOT_IMPLEMENTED
        )


class PerfilEmailConfirmView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    @extend_schema(
        operation_id="confirmarCambioEmailPerfil",
        tags=["Perfil"],
        summary="Confirmar el correo nuevo",
        request=PerfilEmailConfirmRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=PerfilEmailConfirmResponseSerializer,
                description="El nuevo email pasa a ser el de login.",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPerfilSerializer,
                description="uid/token inválidos, expirados o sin cambio pendiente.",
            ),
        },
        description=(
            "Confirma el cambio de correo con uid y token del enlace. "
            "Pública (sin JWT). Solo entonces el email nuevo sustituye al "
            f"actual. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Correo actualizado",
                value={
                    "detail": "El correo se ha actualizado correctamente.",
                    "email": "nuevo@example.com",
                },
                response_only=True,
                status_codes=["200"],
            ),
            OpenApiExample(
                "Enlace inválido",
                value={
                    "detail": "El enlace de verificación no es válido o ha caducado."
                },
                response_only=True,
                status_codes=["400"],
            ),
        ],
    )
    def post(self, request, *args, **kwargs):
        return Response(
            _RESPUESTA_NO_IMPLEMENTADA, status=status.HTTP_501_NOT_IMPLEMENTED
        )


class PerfilPasswordChangeView(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        operation_id="cambiarPasswordPerfil",
        tags=["Perfil"],
        summary="Cambiar la contraseña",
        request=PerfilPasswordChangeRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=PerfilPasswordChangeResponseSerializer,
                description="Contraseña actualizada; solo vale la nueva.",
            ),
            400: OpenApiResponse(
                response=ErrorValidacionPerfilSerializer,
                description=(
                    "Contraseña actual incorrecta, confirmación distinta o "
                    "nueva que no cumple las reglas."
                ),
            ),
            401: OpenApiResponse(
                response=ErrorDetallePerfilSerializer,
                description="Falta el access token, es inválido o ha expirado.",
            ),
        },
        description=(
            "Cambia la contraseña con password_actual, password y "
            "password_confirm (mismas reglas que el registro). Tras el cambio "
            f"solo autentica la nueva. {_CONTRATO}"
        ),
        examples=[
            OpenApiExample(
                "Cambio correcto",
                value={"detail": "La contraseña se ha actualizado correctamente."},
                response_only=True,
                status_codes=["200"],
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
        return Response(
            _RESPUESTA_NO_IMPLEMENTADA, status=status.HTTP_501_NOT_IMPLEMENTED
        )
