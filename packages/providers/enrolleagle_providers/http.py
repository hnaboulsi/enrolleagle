from __future__ import annotations

import time

import httpx

DEFAULT_HEADERS = {
    "User-Agent": "EnrollEagle/1.0 (+https://enrolleagle.example)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


def fetch_url(url: str, timeout_seconds: float = 12.0, retries: int = 3) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = httpx.get(url, headers=DEFAULT_HEADERS, timeout=timeout_seconds, follow_redirects=True)
            return response
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            last_error = exc
            if attempt == retries - 1:
                break
            backoff = min(4.0, 0.5 * (2**attempt))
            time.sleep(backoff)

    raise RuntimeError(f"Failed to fetch URL after retries: {url}") from last_error
