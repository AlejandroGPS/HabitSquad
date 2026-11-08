from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

VOTO_CHOICES = (
    ("sí", "Sí"),
    ("no", "No"),
)

ESTADO_REGISTRO_CHOICES = (
    ("pendiente", "Pendiente"),
    ("cumplido", "Cumplido"),
    ("no_cumplido", "No cumplido"),
)


class EmitirVotoSerializer(serializers.Serializer):
    voto = serializers.ChoiceField(
        choices=VOTO_CHOICES,
        help_text='Valor del voto: "sí" o "no".',
    )


class VotoEmitidoSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField(
        help_text="Identificador del miembro que votó.",
    )
    voto = serializers.ChoiceField(
        choices=VOTO_CHOICES,
        help_text='Valor del voto: "sí" o "no".',
    )


class EstadoVotacionSerializer(serializers.Serializer):
    registro_id = serializers.IntegerField(
        help_text="Identificador del registro diario votado.",
    )
    estado = serializers.ChoiceField(
        choices=ESTADO_REGISTRO_CHOICES,
        help_text=(
            "Estado del registro tras el cómputo: pendiente, cumplido o no_cumplido."
        ),
    )
    votos_si = serializers.IntegerField(
        help_text='Número de votos con valor "sí".',
    )
    votantes_elegibles = serializers.IntegerField(
        help_text=(
            "Miembros del escuadrón excepto el autor de la prueba "
            "(tamaño_escuadrón - 1)."
        ),
    )
    votos_emitidos = serializers.IntegerField(
        help_text="Número de votos ya registrados sobre esa prueba.",
    )
    mayoria_alcanzada = serializers.BooleanField(
        help_text=("true si votos_si > votantes_elegibles / 2 (mayoría simple)."),
    )
    # CharField (no ChoiceField): admite null sin duplicar el enum OpenAPI de voto
    voto_propio = serializers.CharField(
        allow_null=True,
        help_text=(
            'Voto del usuario autenticado ("sí" / "no"), o null si aún no ha '
            "votado o no es votante elegible."
        ),
    )
    votos = VotoEmitidoSerializer(
        many=True,
        help_text="Lista de votos emitidos sobre la prueba.",
    )


@extend_schema_serializer(component_name="ErrorValidacionVoto")
class ErrorValidacionVotoSerializer(serializers.Serializer):
    voto = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
    detail = serializers.CharField(required=False)


@extend_schema_serializer(component_name="ErrorDetalleValidacion")
class ErrorDetalleValidacionSerializer(serializers.Serializer):
    detail = serializers.CharField()
