from django.core.exceptions import ValidationError
from django.db import models

from escuadrones.models import Membresia


class HabitoDiario(models.Model):
    class Opcion(models.TextChoices):
        GIMNASIO = "gimnasio", "Ir al gimnasio"
        LEER = "leer", "Leer"
        ESTUDIAR = "estudiar", "Estudiar"
        OTRO = "otro", "Otro"

    membresia = models.OneToOneField(
        Membresia,
        on_delete=models.CASCADE,
        related_name="habito_diario",
    )
    opcion = models.CharField(max_length=20, choices=Opcion.choices)
    texto_personalizado = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "hábito diario"
        verbose_name_plural = "hábitos diarios"

    def clean(self):
        super().clean()
        if self.opcion == self.Opcion.OTRO and not self.texto_personalizado.strip():
            raise ValidationError(
                {
                    "texto_personalizado": (
                        "Este campo es obligatorio para la opción «Otro»."
                    )
                }
            )

    def __str__(self):
        return f"{self.membresia.usuario} - {self.membresia.escuadron}"
