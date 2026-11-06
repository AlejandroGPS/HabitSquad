from typing import ClassVar

from django.db import models

from .habito_diario import HabitoDiario


class RegistroDiario(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        CUMPLIDO = "cumplido", "Cumplido"
        NO_CUMPLIDO = "no_cumplido", "No cumplido"

    habito = models.ForeignKey(
        HabitoDiario,
        on_delete=models.CASCADE,
        related_name="registros_diarios",
    )
    # Solo guardamos la referencia en Cloudinary, la URL firmada se calcula al leer
    cloudinary_public_id = models.CharField(max_length=255)
    fecha = models.DateField()
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "registro diario"
        verbose_name_plural = "registros diarios"
        constraints: ClassVar[list] = [
            models.UniqueConstraint(
                fields=("habito", "fecha"),
                name="unique_registro_diario_habito_fecha",
            ),
        ]

    def __str__(self):
        return f"{self.habito_id} · {self.fecha} · {self.estado}"
