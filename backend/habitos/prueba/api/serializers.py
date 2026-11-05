from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

ESTADO_PRUEBA_CHOICES = (
    ("pendiente", "Pendiente"),
    ("cumplido", "Cumplido"),
    ("no_cumplido", "No cumplido"),
)


class PruebaFotoUploadSerializer(serializers.Serializer):
    foto = serializers.ImageField(
        help_text=("Imagen de prueba en JPEG, PNG o WebP. Tamaño máximo 5 MB."),
    )


class PruebaFotoSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text="Identificador del registro diario.")
    habito_id = serializers.IntegerField(
        help_text="Identificador del hábito diario del usuario.",
    )
    usuario_id = serializers.IntegerField(
        help_text="Identificador del usuario que ha subido la foto.",
    )
    fecha = serializers.DateField(
        help_text="Día del registro (YYYY-MM-DD, Europe/Madrid).",
    )
    estado = serializers.ChoiceField(
        choices=ESTADO_PRUEBA_CHOICES,
        help_text="Estado de la prueba. Tras la carga es pendiente.",
    )
    foto_url = serializers.URLField(
        help_text=(
            "URL firmada o temporal de la imagen. No es una URL pública permanente."
        ),
    )


@extend_schema_serializer(component_name="ErrorValidacionPruebaFoto")
class ErrorValidacionPruebaFotoSerializer(serializers.Serializer):
    foto = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    detail = serializers.CharField(required=False)


@extend_schema_serializer(component_name="ErrorDetallePruebaFoto")
class ErrorDetallePruebaFotoSerializer(serializers.Serializer):
    detail = serializers.CharField()
