from typing import ClassVar

from django.conf import settings
from django.db import models


class SuscripcionPush(models.Model):
    """Suscripción Web Push de un usuario (un endpoint por dispositivo)."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="suscripciones_push",
    )
    endpoint = models.TextField()
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "suscripción push"
        verbose_name_plural = "suscripciones push"
        constraints: ClassVar[list] = [
            models.UniqueConstraint(
                fields=("endpoint",),
                name="unique_suscripcion_push_endpoint",
            ),
        ]

    def __str__(self):
        return f"{self.usuario_id}: {self.endpoint[:48]}"
