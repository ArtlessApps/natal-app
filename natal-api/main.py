# main.py — the front door. Defines the endpoints, validates input,
# calls engine.py, and shapes the JSON that goes back to the app.

import os
from datetime import date as date_type

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from timezonefinder import TimezoneFinder

import engine  # your refactored astrology logic
import push  # daily Expo Push pipeline (Build Phase 6)
import compat  # synastry-lite comparison (Build Phase 8)

load_dotenv()  # reads .env so engine.py can reach Supabase

# Shared secret for the hourly cron. Set CRON_SECRET in natal-api/.env and
# pass it as `Authorization: Bearer <secret>` (or `x-cron-secret`) from the
# scheduler. Empty = endpoint refuses every request (safe default).
CRON_SECRET = os.getenv("CRON_SECRET", "")

app = FastAPI(title="Natal API")

# Allow the Expo web app (and later the phone app) to call this API.
# "*" is fine for local development; we'll lock it down at deploy time.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# TimezoneFinder is expensive to create, so we make ONE and reuse it.
tf = TimezoneFinder()


# ---------- Request/response shapes ----------
# Pydantic models describe what JSON we accept. FastAPI uses them to
# auto-validate: wrong/missing fields get rejected with a clear error
# before our code even runs.

class NatalRequest(BaseModel):
    name: str
    date: str          # "1990-06-15"
    time: str | None   # "14:30", or null if birth time unknown
    lat: float
    lng: float


class CompatRequest(BaseModel):
    # The two serialized chart_json objects the app already has (owner's
    # profile + friend's guest chart). PRD §6 sketches chart_id_a/b, but this
    # service has no server-side chart store yet, so we pass the charts
    # directly — same tradeoff as /daily. See PRD debt.
    chart_a: dict
    chart_b: dict
    name_a: str
    name_b: str


class DailyRequest(BaseModel):
    # Same birth data (the app stores it and sends it back) — see PRD debt
    # re: switching /daily to a pure user_id lookup. user_id is optional
    # (omitting it just disables cooldown tracking, same as before it
    # existed) but the app always sends the signed-in user's id so
    # transit_cooldowns has something to key on.
    name: str
    date: str
    time: str | None
    lat: float
    lng: float
    target_date: str   # the day to compute, "2026-07-07"
    user_id: str | None = None


# ---------- Helpers ----------

def resolve_tz(lat: float, lng: float) -> str:
    """Derive IANA timezone from coordinates (e.g. 'America/Los_Angeles')."""
    tz_str = tf.timezone_at(lat=lat, lng=lng)
    if tz_str is None:
        raise HTTPException(status_code=400, detail="Could not resolve timezone from coordinates")
    return tz_str


def make_subject(req, tz_str: str | None = None) -> object:
    """Turn raw request fields into a Kerykeion natal subject."""
    # Prefer a stored tz_str (profiles) so the cron doesn't re-geocode every day;
    # fall back to timezonefinder from lat/lng for fresh /natal and /daily calls.
    resolved_tz = tz_str or resolve_tz(req.lat, req.lng)

    year, month, day = (int(p) for p in req.date.split("-"))

    # Unknown birth time → noon chart (PRD 4.1). Rising sign is
    # unreliable in that case; the app shows a note.
    if req.time:
        hour, minute = (int(p) for p in req.time.split(":"))
    else:
        hour, minute = 12, 0

    return engine.build_natal_subject(
        name=req.name, year=year, month=month, day=day,
        hour=hour, minute=minute, lat=req.lat, lng=req.lng, tz_str=resolved_tz,
    )


PLANETS = ["sun", "moon", "mercury", "venus", "mars",
           "jupiter", "saturn", "uranus", "neptune", "pluto"]

def serialize_chart(subject) -> dict:
    """Convert a Kerykeion subject into plain JSON the app can render."""
    placements = []
    for planet_name in PLANETS:
        p = getattr(subject, planet_name)  # e.g. subject.sun
        placements.append({
            "planet": planet_name,
            "sign": p.sign,             # e.g. "Gem"
            "position": round(p.position, 2),  # degrees into the sign
            "house": p.house,           # e.g. "Tenth_House"
            "retrograde": bool(getattr(p, "retrograde", False)),
        })

    return {
        "big3": {
            "sun": subject.sun.sign,
            "moon": subject.moon.sign,
            "rising": subject.first_house.sign,  # Ascendant = 1st house cusp
        },
        "placements": placements,
        "houses": [
            {"house": i + 1, "sign": h.sign, "position": round(h.position, 2)}
            for i, h in enumerate([
                subject.first_house, subject.second_house, subject.third_house,
                subject.fourth_house, subject.fifth_house, subject.sixth_house,
                subject.seventh_house, subject.eighth_house, subject.ninth_house,
                subject.tenth_house, subject.eleventh_house, subject.twelfth_house,
            ])
        ],
        "birth_time_known": True,  # main.py overwrites this below when needed
    }


# ---------- Endpoints ----------

@app.get("/health")
def health():
    """Cheap 'is it alive?' check — useful once deployed."""
    return {"ok": True}


@app.post("/natal")
def natal(req: NatalRequest):
    tz_str = resolve_tz(req.lat, req.lng)
    subject = make_subject(req, tz_str=tz_str)
    chart = serialize_chart(subject)
    chart["birth_time_known"] = req.time is not None
    # App stores tz_str on the profile so the daily-push cron can schedule
    # against the user's local clock without re-running timezonefinder.
    return {"chart": chart, "tz_str": tz_str}


@app.post("/daily")
def daily(req: DailyRequest):
    subject = make_subject(req)
    target = date_type.fromisoformat(req.target_date)

    driver = engine.compute_daily(subject, target, user_id=req.user_id)  # the astrology
    content = engine.lookup_content(driver)            # the words

    return {
        "type": driver["type"],        # COLLISION / TRANSIT / RIPPLE / WALKING
        "driver": driver,              # powers the "Why?" disclosure (PRD 4.2)
        "headline": content["headline"],
        "body": content["body"],
        "prompt": content["prompt"],
        "content_id": content["content_id"],
    }


@app.post("/compat")
def compatibility(req: CompatRequest):
    """Side-by-side Big 3 + synastry-lite insights for two charts (PRD §4.5)."""
    return compat.compute_compat(req.chart_a, req.chart_b, req.name_a, req.name_b)


# ---------- Friend invites (Step 8.6) ----------
# NOTE: these two routes have NO user auth on purpose — the opaque `token` in
# the URL IS the credential (one token = one invite row). The guest has no
# account, so they never hit Supabase directly; we do the write here with the
# service-key client, exactly like the cron.

def _owner_first_name(client, owner_id: str) -> str:
    """First name of the invite's owner, for the guest-facing copy."""
    res = client.table("profiles").select("name").eq("id", owner_id).limit(1).execute()
    rows = res.data or []
    full = (rows[0].get("name") if rows else None) or ""
    return full.split()[0] if full.strip() else "Someone"


@app.get("/invite/{token}")
def get_invite(token: str):
    """Landing-page lookup for the guest. 404 if the token is unknown."""
    client = engine.create_supabase_client()
    res = client.table("friends").select("id, owner_id, status").eq("token", token).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invite not found")
    row = rows[0]
    return {"inviter_name": _owner_first_name(client, row["owner_id"]), "status": row["status"]}


@app.post("/invite/{token}/submit")
def submit_invite(token: str, req: NatalRequest):
    """
    Guest submits their own birth data. We compute their chart, complete the
    friends row, and push the owner. 404 if token unknown, 409 if already used.
    """
    client = engine.create_supabase_client()
    res = client.table("friends").select("id, owner_id, status").eq("token", token).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invite not found")
    row = rows[0]
    if row["status"] == "complete":
        raise HTTPException(status_code=409, detail="This invite was already used")

    # Same pipeline as /natal so the guest's Big 3 matches everything else.
    tz_str = resolve_tz(req.lat, req.lng)
    subject = make_subject(req, tz_str=tz_str)
    chart = serialize_chart(subject)
    chart["birth_time_known"] = req.time is not None

    client.table("friends").update({
        "guest_name": req.name,
        "guest_chart_json": chart,
        "birth_date": req.date,
        "birth_time": req.time,
        "status": "complete",
    }).eq("id", row["id"]).execute()

    inviter_name = _owner_first_name(client, row["owner_id"])

    # Notify the owner — best-effort, a push failure must not fail the guest.
    try:
        prof = client.table("profiles").select("push_token").eq("id", row["owner_id"]).limit(1).execute()
        pdata = prof.data or []
        push_token = pdata[0].get("push_token") if pdata else None
        if push_token:
            push.send_push(
                push_token,
                title="Your compatibility is ready",
                body=f"{req.name} just added their chart. See how your skies fit.",
                data={"url": f"/friends/{row['id']}"},
            )
    except Exception:  # noqa: BLE001
        pass

    return {"big3": chart["big3"], "inviter_name": inviter_name}


@app.post("/cron/daily-push")
def cron_daily_push(
    authorization: str | None = Header(default=None),
    x_cron_secret: str | None = Header(default=None),
):
    """
    Hourly job (PRD 4.7). Finds users whose local clock is currently in
    their notify_hour_local window, computes today's reading, and sends
    an Expo Push whose body is the headline.

    Auth: Authorization: Bearer <CRON_SECRET>  OR  x-cron-secret: <CRON_SECRET>
    Schedule example (system cron):  5 * * * *  curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://api…/cron/daily-push
    """
    if not CRON_SECRET:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")

    provided = None
    if authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()
    elif x_cron_secret:
        provided = x_cron_secret.strip()

    if provided != CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return push.run_daily_push()
