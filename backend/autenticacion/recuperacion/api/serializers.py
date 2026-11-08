from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from ..services.reset import reset_password
from ..services.verification import verify_email


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetRequestResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class EmailVerificationSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        user = verify_email(
            uid=attrs["uid"],
            token=attrs["token"],
        )
        if user is None:
            raise serializers.ValidationError(
                {"token": "El enlace de verificación no es válido o ha expirado."}
            )
        attrs["user"] = user
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Las contraseñas no coinciden."}
            )

        user = reset_password(
            uid=attrs["uid"],
            token=attrs["token"],
            password=attrs["new_password"],
            validate_only=True,
        )
        if user is None:
            raise serializers.ValidationError(
                {"token": "El enlace de recuperación no es válido o ha expirado."}
            )

        validate_password(attrs["new_password"], user=user)
        attrs["user"] = user
        return attrs
