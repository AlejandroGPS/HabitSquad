import pytest


@pytest.fixture(autouse=True)
def usar_capa_de_canales_en_memoria(settings):
    settings.CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
