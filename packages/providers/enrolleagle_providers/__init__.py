from enrolleagle_providers.build_watch import build_watch_from_user_input
from enrolleagle_providers.providers.deanza import DeAnzaProvider
from enrolleagle_providers.providers.foothill import FoothillProvider
from enrolleagle_providers.providers.socccd import SocccdProvider
from enrolleagle_providers.providers.unsupported import UnsupportedProvider


def get_provider_registry() -> dict[str, object]:
    return {
        "foothill": FoothillProvider(),
        "socccd": SocccdProvider(),
        "deanza": DeAnzaProvider(),
        "smc": UnsupportedProvider("smc", "Public endpoint parser is not stable in v1."),
        "sdccd": UnsupportedProvider("sdccd", "Public endpoint parser is not stable in v1."),
        "vsb4cd": UnsupportedProvider("vsb4cd", "4CD/VSB parser is scaffolded as unsupported in v1."),
    }


def get_provider(name: str):
    registry = get_provider_registry()
    return registry.get(name)


__all__ = ["build_watch_from_user_input", "get_provider", "get_provider_registry"]
