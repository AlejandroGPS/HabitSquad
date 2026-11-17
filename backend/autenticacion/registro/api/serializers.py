from django.contrib.auth.password_validation import validate_password
from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from autenticacion.registro.services.registration import create_registered_user
from usuarios.models import CustomUser


@extend_schema_serializer(component_name="RegistroUsuarioRequest")
class UserRegistrationRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(
        help_text="Email de la cuenta. Se normaliza a minúsculas.",
    )
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        help_text="Contraseña (requisitos de Django validate_password).",
    )
    password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        help_text="Debe coincidir exactamente con password.",
    )
    nickname = serializers.CharField(
        help_text=(
            "Nombre de usuario público. Tras strip, no vacío y único "
            "(comparación sin distinguir mayúsculas)."
        ),
    )


@extend_schema_serializer(component_name="RegistroUsuarioResponse")
class UserRegistrationResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Identificador del usuario creado.")
    email = serializers.EmailField(help_text="Email normalizado de la cuenta.")
    nickname = serializers.CharField(help_text="Nickname elegido en el alta.")
    date_joined = serializers.DateTimeField(
        help_text="Momento de creación de la cuenta.",
    )


@extend_schema_serializer(component_name="ErrorValidacionRegistro")
class ErrorValidacionRegistroSerializer(serializers.Serializer):
    email = serializers.ListField(child=serializers.CharField(), required=False)
    password = serializers.ListField(child=serializers.CharField(), required=False)
    password_confirm = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    nickname = serializers.ListField(child=serializers.CharField(), required=False)
    detail = serializers.CharField(required=False)


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)
    nickname = serializers.CharField()

    class Meta:
        model = CustomUser
        fields = (
            "id",
            "email",
            "password",
            "password_confirm",
            "nickname",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined")

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if CustomUser.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return normalized_email

    def validate_nickname(self, value):
        nickname = value.strip()
        if not nickname:
            raise serializers.ValidationError("Este campo no puede estar en blanco.")
        if CustomUser.objects.filter(nickname__iexact=nickname).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este nickname.")
        return nickname

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Las contraseñas no coinciden."}
            )
        validate_password(
            attrs["password"],
            user=CustomUser(email=attrs["email"], nickname=attrs["nickname"]),
        )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return create_registered_user(**validated_data)
