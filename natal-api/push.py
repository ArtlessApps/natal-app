"""
Daily push pipeline (PRD 4.7 / Build Phase 6).

An hourly cron hits POST /cron/daily-push. For each profile that:
  - has a push_token
  - has birth data + tz_str
  - is currently at notify_hour_local in their timezone
  - hasn't already been pushed today (last_push_date != local today)

…we compute their daily reading and send an Expo Push whose body is the
headline, deep-linking to the Today tab.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

import engine

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
# Expo accepts up to 100 messages per request.
EXPO_BATCH_SIZE = 100


def _local_now(tz_str: str) -> datetime | None:
    try:
        return datetime.now(ZoneInfo(tz_str))
    except ZoneInfoNotFoundError:
        return None


def _ensure_tz(client, row: dict) -> str | None:
    """
    Prefer the stored tz_str. For profiles created before Build Phase 6
    (no tz_str column filled), derive it from lat/lng via timezonefinder
    and persist so the next hourly run doesn't re-geocode.
    """
    if row.get("tz_str"):
        return row["tz_str"]
    lat, lng = row.get("lat"), row.get("lng")
    if lat is None or lng is None:
        return None
    # Lazy import — push.py shouldn't require main.py's FastAPI app.
    from timezonefinder import TimezoneFinder

    tz_str = TimezoneFinder().timezone_at(lat=float(lat), lng=float(lng))
    if not tz_str:
        return None
    try:
        client.table("profiles").update({"tz_str": tz_str}).eq("id", row["id"]).execute()
    except Exception:  # noqa: BLE001 — still usable for this run even if persist fails
        pass
    row["tz_str"] = tz_str
    return tz_str


def profiles_due_now(client) -> list[dict]:
    """
    Fetch every profile with a push token, then keep only those whose
    local clock is currently in the notify_hour_local hour and who
    haven't already been pushed for their local today.
    """
    response = (
        client.table("profiles")
        .select(
            "id, name, birth_date, birth_time, lat, lng, tz_str, "
            "push_token, notify_hour_local, last_push_date"
        )
        .not_.is_("push_token", "null")
        .execute()
    )
    due: list[dict] = []
    for row in response.data or []:
        if not row.get("birth_date"):
            continue
        tz_str = _ensure_tz(client, row)
        if not tz_str:
            continue
        local = _local_now(tz_str)
        if local is None:
            continue
        hour = row.get("notify_hour_local")
        if hour is None:
            hour = 8
        if local.hour != int(hour):
            continue
        local_today = local.date().isoformat()
        if row.get("last_push_date") == local_today:
            continue
        due.append(row)
    return due


def compute_headline(row: dict) -> tuple[str, date]:
    """
    Run the same /daily pipeline the app uses, returning (headline, local_date).
    Falls back to a short generic line if content lookup returns nothing —
    better a quiet push than a crash that skips the rest of the batch.
    """
    local = _local_now(row["tz_str"])
    assert local is not None  # filtered in profiles_due_now
    target = local.date()

    birth_time = row.get("birth_time") or "12:00"
    hour_s, minute_s = birth_time.split(":")[:2]
    subject = engine.build_natal_subject(
        name=row["name"] or "You",
        year=int(row["birth_date"][0:4]),
        month=int(row["birth_date"][5:7]),
        day=int(row["birth_date"][8:10]),
        hour=int(hour_s),
        minute=int(minute_s),
        lat=float(row["lat"]),
        lng=float(row["lng"]),
        tz_str=row["tz_str"],
    )
    driver = engine.compute_daily(subject, target)
    content = engine.lookup_content(driver)
    headline = (content.get("headline") or "").strip() or "Your sky for today."
    # Expo push title/body should stay short; PRD caps headline at 90 chars.
    if len(headline) > 90:
        headline = headline[:87].rstrip() + "…"
    return headline, target


def build_message(token: str, headline: str) -> dict[str, Any]:
    return {
        "to": token,
        "title": "Natal",
        "body": headline,
        "sound": "default",
        "data": {"url": "/"},  # deep-link to Today tab (PRD 4.7)
    }


def send_expo_batch(messages: list[dict]) -> list[dict]:
    """POST a batch to Expo Push Service; returns per-ticket results."""
    if not messages:
        return []
    results: list[dict] = []
    with httpx.Client(timeout=30.0) as http:
        for i in range(0, len(messages), EXPO_BATCH_SIZE):
            chunk = messages[i : i + EXPO_BATCH_SIZE]
            res = http.post(
                EXPO_PUSH_URL,
                json=chunk,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
            res.raise_for_status()
            payload = res.json()
            # Expo returns { data: [ { status, id, ... }, ... ] }
            results.extend(payload.get("data") or [])
    return results


def send_push(token: str, title: str, body: str, data: dict | None = None) -> dict:
    """
    Send a single Expo Push (used by the invite-completion notification, and
    reusable by anything else that needs a one-off push — the daily cron builds
    its own batch). Best-effort: returns the Expo ticket, or a synthesized error
    dict if the send failed, so callers can log without crashing.
    """
    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
    }
    try:
        tickets = send_expo_batch([message])
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": str(e)}
    return tickets[0] if tickets else {"status": "error", "message": "no ticket returned"}


def mark_pushed(client, user_id: str, local_date: date) -> None:
    client.table("profiles").update(
        {"last_push_date": local_date.isoformat()}
    ).eq("id", user_id).execute()


def clear_invalid_token(client, user_id: str) -> None:
    """DeviceUnregistered / etc. — drop the token so we stop retrying."""
    client.table("profiles").update({"push_token": None}).eq("id", user_id).execute()


def run_daily_push() -> dict:
    """
    Main entry point for the cron. Returns a small summary the caller can log.
    """
    client = engine.create_supabase_client()
    due = profiles_due_now(client)

    sent = 0
    skipped = 0
    errors: list[str] = []
    # Keep (user_id, local_date, token) aligned with messages so we can
    # mark success / clear bad tokens from the Expo ticket response.
    pending: list[tuple[str, date, str]] = []
    messages: list[dict] = []

    for row in due:
        try:
            headline, local_date = compute_headline(row)
            token = row["push_token"]
            messages.append(build_message(token, headline))
            pending.append((row["id"], local_date, token))
        except Exception as e:  # noqa: BLE001 — one bad chart shouldn't kill the batch
            skipped += 1
            errors.append(f"{row.get('id')}: compute failed: {e}")

    try:
        tickets = send_expo_batch(messages)
    except Exception as e:  # noqa: BLE001
        return {
            "due": len(due),
            "sent": 0,
            "skipped": skipped + len(messages),
            "errors": errors + [f"expo push failed: {e}"],
        }

    for (user_id, local_date, _token), ticket in zip(pending, tickets):
        status = (ticket or {}).get("status")
        if status == "ok":
            try:
                mark_pushed(client, user_id, local_date)
                sent += 1
            except Exception as e:  # noqa: BLE001
                errors.append(f"{user_id}: mark_pushed failed: {e}")
        else:
            # DeviceUnregistered / InvalidCredentials / MessageTooBig / etc.
            details = (ticket or {}).get("details") or {}
            err_code = details.get("error") or (ticket or {}).get("message") or "unknown"
            errors.append(f"{user_id}: expo {err_code}")
            if err_code in ("DeviceUnregistered", "InvalidCredentials"):
                try:
                    clear_invalid_token(client, user_id)
                except Exception as e:  # noqa: BLE001
                    errors.append(f"{user_id}: clear_token failed: {e}")
            skipped += 1

    # If Expo returned fewer tickets than messages (shouldn't happen), count the rest as skipped.
    if len(tickets) < len(pending):
        skipped += len(pending) - len(tickets)

    return {"due": len(due), "sent": sent, "skipped": skipped, "errors": errors}
