from enrolleagle_providers.build_watch import build_watch_from_user_input
from enrolleagle_providers.providers.deanza import DeAnzaProvider
from enrolleagle_providers.providers.deanza_search import DeAnzaSearchAdapter
from enrolleagle_providers.providers.foothill import FoothillProvider
from enrolleagle_providers.providers.foothill_search import FoothillSearchAdapter
from enrolleagle_providers.providers.socccd import SocccdProvider
from enrolleagle_providers.providers.socccd_search import SocccdSearchAdapter
from enrolleagle_providers.providers.unsupported import UnsupportedProvider
from enrolleagle_providers.providers.unsupported_search import UnsupportedSearchAdapter
from enrolleagle_providers.types import SchoolInfo


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


def get_search_registry() -> dict[str, object]:
    return {
        "foothill": FoothillSearchAdapter(),
        "socccd": SocccdSearchAdapter(campus="ivc"),
        "deanza": DeAnzaSearchAdapter(),
        "smc": UnsupportedSearchAdapter("smc", "Search not available for this school yet."),
        "sdccd": UnsupportedSearchAdapter("sdccd", "Search not available for this school yet."),
        "vsb4cd": UnsupportedSearchAdapter("vsb4cd", "Search not available for this school yet."),
    }


def get_schools() -> list[SchoolInfo]:
    return [
        SchoolInfo(id="foothill", name="Foothill College", supports_search=True, supports_seat_check=True),
        SchoolInfo(id="deanza", name="De Anza College", supports_search=True, supports_seat_check=True),
        SchoolInfo(id="socccd", name="Irvine Valley / Saddleback (SOCCCD)", supports_search=True, supports_seat_check=True),
        SchoolInfo(id="smc", name="Santa Monica College", supports_search=False, supports_seat_check=False, notes="Search not available yet"),
        SchoolInfo(id="sdccd", name="SDCCD", supports_search=False, supports_seat_check=False, notes="Search not available yet"),
        SchoolInfo(id="vsb4cd", name="4CD / VSB", supports_search=False, supports_seat_check=False, notes="Search not available yet"),
    ]


__all__ = [
    "build_watch_from_user_input",
    "get_provider",
    "get_provider_registry",
    "get_search_registry",
    "get_schools",
]
