import django.core.validators
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [("escuadrones", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="escuadron",
            name="es_publico",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="escuadron",
            name="limite_miembros",
            field=models.PositiveIntegerField(
                default=5,
                validators=[django.core.validators.MinValueValidator(2)],
            ),
        ),
        migrations.AddConstraint(
            model_name="escuadron",
            constraint=models.CheckConstraint(
                condition=Q(limite_miembros__gte=2),
                name="escuadron_limite_miembros_minimo_2",
            ),
        ),
    ]
