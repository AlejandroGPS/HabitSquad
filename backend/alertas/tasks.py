from alertas.services import procesar_avisos_pendientes


def enviar_avisos_pendientes() -> int:
    """Evalúa el minuto local actual y envía avisos Web Push si procede."""
    return procesar_avisos_pendientes()
