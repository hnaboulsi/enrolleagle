from enrolleagle_providers.block_detection import detect_blocked_response


def test_detect_blocked_by_status_code() -> None:
    blocked, reason = detect_blocked_response(403, "Forbidden")
    assert blocked is True
    assert "403" in (reason or "")


def test_detect_blocked_by_challenge_marker() -> None:
    blocked, reason = detect_blocked_response(200, "<html>Just a moment... cf-chl</html>")
    assert blocked is True
    assert reason is not None


def test_detect_expected_tokens_missing_with_gate_hints() -> None:
    blocked, reason = detect_blocked_response(
        200,
        "<html>Please enable JavaScript and disable ad blocker</html>",
        expected_tokens=("open seats",),
    )
    assert blocked is True
    assert "Expected seat tokens missing" in (reason or "")


def test_non_blocked_normal_page() -> None:
    blocked, reason = detect_blocked_response(200, "<html>Open Seats: 3</html>", expected_tokens=("open seats",))
    assert blocked is False
    assert reason is None
