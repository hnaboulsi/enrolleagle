from pathlib import Path

from enrolleagle_providers.build_watch import build_watch_from_user_input
from enrolleagle_providers.providers.deanza import DeAnzaProvider
from enrolleagle_providers.providers.foothill import parse_foothill_html
from enrolleagle_providers.providers.socccd import parse_socccd_html
from enrolleagle_providers.providers.unsupported import UnsupportedProvider

FIXTURES = Path(__file__).parent / "fixtures"


def read_fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_foothill_parser_extracts_seats_and_waitlist() -> None:
    result = parse_foothill_html(read_fixture("fhda.html"), "12345")
    assert result.open_seats == 10
    assert result.waitlist_open_seats == 2
    assert result.status == "OPEN"


def test_socccd_parser_extracts_open_seats() -> None:
    result = parse_socccd_html(read_fixture("ivc.html"), "33445")
    assert result.open_seats == 2
    assert result.waitlist_open_seats == 0
    assert result.status == "OPEN"


def test_deanza_requires_source_url() -> None:
    provider = DeAnzaProvider()
    result = provider.get_seat_status({"section_ref": "12345", "term_ref": "2026SP"})
    assert result.status == "UNSUPPORTED"
    assert "required" in (result.block_reason or "")


def test_unsupported_provider_shape() -> None:
    provider = UnsupportedProvider("smc", "unsupported in v1")
    result = provider.get_seat_status({"section_ref": "x", "term_ref": "2026SP"})
    assert result.status == "UNSUPPORTED"
    assert result.block_reason == "unsupported in v1"


def test_build_watch_soccd_payload() -> None:
    watch = build_watch_from_user_input(
        {
            "provider": "socccd",
            "class_number": "33445",
            "term_ref": "2026SP",
            "campus_code": "ivc",
        }
    )
    assert watch["section_ref"] == "33445"
    assert watch["term_ref"] == "2026SP"
    assert watch["fetch_key"].startswith("socccd:ivc:2026SP")


def test_build_watch_requires_deanza_url() -> None:
    try:
        build_watch_from_user_input(
            {
                "provider": "deanza",
                "crn": "12345",
                "term_ref": "2026SP",
            }
        )
    except ValueError as exc:
        assert "requires pasted_url" in str(exc)
    else:  # pragma: no cover
        raise AssertionError("Expected ValueError for missing deanza pasted_url")
