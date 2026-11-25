from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers


def _campo_no_vacio(valor: str, mensaje: str) -> str:
    limpio = valor.strip() if isinstance(valor, str) else valor
    if not limpio:
        raise serializers.ValidationError(mensaje)
    return limpio


@extend_schema_serializer(component_name="VapidPublicKey")
class VapidPublicKeySerializer(serializers.Serializer):
    public_key = serializers.CharField(
        help_text=("Clave pública VAPID en el formato que espera el cliente Web Push."),
    )


@extend_schema_serializer(component_name="SuscripcionKeys")
class SuscripcionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField(
        help_text="Clave pública del cliente (p256dh).",
    )
    auth = serializers.CharField(
        help_text="Secreto de autenticación de la suscripción.",
    )

    def validate_p256dh(self, value):
        return _campo_no_vacio(value, "Este campo no puede estar vacío.")

    def validate_auth(self, value):
        return _campo_no_vacio(value, "Este campo no puede estar vacío.")


@extend_schema_serializer(component_name="SuscripcionCreate")
class SuscripcionCreateSerializer(serializers.Serializer):
    endpoint = serializers.URLField(
        help_text="URL del servicio push; tras strip no vacía.",
    )
    keys = SuscripcionKeysSerializer()

    def validate_endpoint(self, value):
        return _campo_no_vacio(value, "Este campo no puede estar vacío.")


@extend_schema_serializer(component_name="SuscripcionResponse")
class SuscripcionResponseSerializer(serializers.Serializer):
    endpoint = serializers.URLField(help_text="Endpoint registrado.")
    creado = serializers.BooleanField(
        help_text="true si se creó; false si se actualizó.",
    )


@extend_schema_serializer(component_name="SuscripcionDelete")
class SuscripcionDeleteSerializer(serializers.Serializer):
    endpoint = serializers.URLField(
        help_text="Endpoint de la suscripción a eliminar.",
    )

    def validate_endpoint(self, value):
        return _campo_no_vacio(value, "Este campo no puede estar vacío.")


@extend_schema_serializer(component_name="ErrorValidacionAlertas")
class ErrorValidacionAlertasSerializer(serializers.Serializer):
    endpoint = serializers.ListField(child=serializers.CharField(), required=False)
    keys = serializers.ListField(child=serializers.CharField(), required=False)
    detail = serializers.CharField(required=False)


@extend_schema_serializer(component_name="ErrorDetalleAlertas")
class ErrorDetalleAlertasSerializer(serializers.Serializer):
    detail = serializers.CharField()
