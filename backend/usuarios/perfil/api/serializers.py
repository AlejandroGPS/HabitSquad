from datetime import datetime

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from usuarios.models import CustomUser
from usuarios.perfil.services import cambiar_password


@extend_schema_serializer(component_name="PerfilUsuario")
class PerfilUsuarioSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Identificador del usuario.")
    email = serializers.EmailField(help_text="Email actual de login (normalizado).")
    nickname = serializers.CharField(help_text="Nombre de usuario público.")
    foto_url = serializers.URLField(
        allow_null=True,
        help_text=(
            "URL firmada o temporal de la foto de perfil. null si no hay foto. "
            "No es una URL pública permanente."
        ),
    )
    email_pendiente = serializers.EmailField(
        allow_null=True,
        help_text=(
            "Nueva dirección solicitada y aún no confirmada. "
            "null si no hay cambio en curso."
        ),
    )
    hora_aviso = serializers.CharField(
        help_text="Hora del aviso de falta de prueba (HH:MM, 24 h). Por defecto 20:00.",
    )


@extend_schema_serializer(component_name="PerfilUsuarioUpdate")
class PerfilUsuarioUpdateSerializer(serializers.Serializer):
    nickname = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=False,
        help_text=(
            "Tras strip, no vacío y único (sin distinguir mayúsculas). "
            "Si está en uso por otro usuario, se rechaza."
        ),
    )
    hora_aviso = serializers.CharField(
        required=False,
        help_text="Hora en formato HH:MM (24 h), por ejemplo 20:00 o 09:05.",
    )

    def validate(self, attrs):
        if (
            "nickname" not in self.initial_data
            and "hora_aviso" not in self.initial_data
        ):
            raise serializers.ValidationError("Debes enviar nickname y/o hora_aviso.")
        return attrs

    def validate_nickname(self, value):
        nickname = value.strip()
        if not nickname:
            raise serializers.ValidationError("Este campo no puede estar en blanco.")

        user = self.context["request"].user
        if user.nickname.casefold() == nickname.casefold():
            return nickname

        if (
            CustomUser.objects.filter(nickname__iexact=nickname)
            .exclude(pk=user.pk)
            .exists()
        ):
            raise serializers.ValidationError("Ya existe una cuenta con este nickname.")
        return nickname

    def validate_hora_aviso(self, value):
        try:
            return datetime.strptime(value, "%H:%M").time()
        except (TypeError, ValueError) as error:
            raise serializers.ValidationError(
                "Indica la hora en formato HH:MM."
            ) from error

    def save(self, **kwargs):
        user = self.context["request"].user
        update_fields: list[str] = []

        if "nickname" in self.validated_data:
            user.nickname = self.validated_data["nickname"]
            update_fields.append("nickname")
        if "hora_aviso" in self.validated_data:
            user.hora_aviso = self.validated_data["hora_aviso"]
            update_fields.append("hora_aviso")

        if update_fields:
            user.save(update_fields=update_fields)
        return user


@extend_schema_serializer(component_name="PerfilFotoUpload")
class PerfilFotoUploadSerializer(serializers.Serializer):
    foto = serializers.FileField(
        help_text="Imagen JPEG, PNG o WebP. Tamaño máximo 5 MB.",
    )


@extend_schema_serializer(component_name="PerfilFotoResponse")
class PerfilFotoResponseSerializer(serializers.Serializer):
    foto_url = serializers.URLField(
        help_text="URL firmada o temporal de la foto guardada.",
    )


@extend_schema_serializer(component_name="PerfilEmailChangeRequest")
class PerfilEmailChangeRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        help_text=(
            "Nuevo correo (strip + minúsculas). No debe estar registrado "
            "ni ser igual al actual."
        ),
    )

    def validate_email(self, value):
        normalized = CustomUser.objects.normalize_email(value)
        user = self.context["request"].user
        if normalized == user.email:
            raise serializers.ValidationError(
                "El nuevo correo debe ser distinto al actual."
            )
        if (
            CustomUser.objects.filter(email__iexact=normalized)
            .exclude(pk=user.pk)
            .exists()
        ):
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return normalized


@extend_schema_serializer(component_name="PerfilEmailChangeResponse")
class PerfilEmailChangeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email_pendiente = serializers.EmailField(
        help_text="Dirección solicitada, pendiente de confirmación.",
    )


@extend_schema_serializer(component_name="PerfilEmailConfirmRequest")
class PerfilEmailConfirmRequestSerializer(serializers.Serializer):
    uid = serializers.CharField(
        help_text="Identificador del usuario codificado en el enlace.",
    )
    token = serializers.CharField(
        help_text="Token de un solo uso asociado al cambio pendiente.",
    )


@extend_schema_serializer(component_name="PerfilEmailConfirmResponse")
class PerfilEmailConfirmResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    email = serializers.EmailField(help_text="Email de login tras la confirmación.")


@extend_schema_serializer(component_name="PerfilPasswordChangeRequest")
class PerfilPasswordChangeRequestSerializer(serializers.Serializer):
    password_actual = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        help_text="Contraseña vigente. No se hace trim.",
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        help_text=(
            "Nueva contraseña (validate_password, como en el registro). "
            "No se hace trim."
        ),
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        help_text="Debe coincidir exactamente con password.",
    )

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["password_actual"]):
            raise serializers.ValidationError(
                {"password_actual": "La contraseña actual no es correcta."}
            )
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(
                {"password": list(error.messages)}
            ) from error
        return attrs

    def save(self, **kwargs):
        return cambiar_password(
            user=self.context["request"].user,
            password=self.validated_data["password"],
        )


@extend_schema_serializer(component_name="PerfilPasswordChangeResponse")
class PerfilPasswordChangeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


@extend_schema_serializer(component_name="ErrorValidacionPerfil")
class ErrorValidacionPerfilSerializer(serializers.Serializer):
    nickname = serializers.ListField(child=serializers.CharField(), required=False)
    hora_aviso = serializers.ListField(child=serializers.CharField(), required=False)
    foto = serializers.ListField(child=serializers.CharField(), required=False)
    email = serializers.ListField(child=serializers.CharField(), required=False)
    password_actual = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    password = serializers.ListField(child=serializers.CharField(), required=False)
    password_confirm = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    uid = serializers.ListField(child=serializers.CharField(), required=False)
    token = serializers.ListField(child=serializers.CharField(), required=False)
    detail = serializers.CharField(required=False)


@extend_schema_serializer(component_name="ErrorDetallePerfil")
class ErrorDetallePerfilSerializer(serializers.Serializer):
    detail = serializers.CharField()
