"""
Chart-calculation engine: natal chart construction, single-day transit
analysis, and content-table lookup.

Refactored from the founder's existing journal_generator.py (the working
Kerykeion pipeline at ~/Documents/Projects/Natal). All thresholds, aspect
filtering, priority bucketing, intensity classification, and Walking
fallback logic are carried over unchanged. What's NOT ported: the CLI
prompts, geopy geocoding, and PDF/CSV/markdown export — those are specific
to the journal-generator project, not the API's job.
"""

import os
import random
from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Optional, Tuple

from dotenv import load_dotenv
from kerykeion import AstrologicalSubjectFactory, ChartDataFactory
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Map Kerykeion abbreviations to database full names.
SIGN_MAP = {
    "Ari": "Aries",
    "Tau": "Taurus",
    "Gem": "Gemini",
    "Can": "Cancer",
    "Leo": "Leo",
    "Vir": "Virgo",
    "Lib": "Libra",
    "Sco": "Scorpio",
    "Sag": "Sagittarius",
    "Cap": "Capricorn",
    "Aqu": "Aquarius",
    "Pis": "Pisces",
}

ZODIAC_OFFSETS = {
    "Ari": 0,
    "Tau": 30,
    "Gem": 60,
    "Can": 90,
    "Leo": 120,
    "Vir": 150,
    "Lib": 180,
    "Sco": 210,
    "Sag": 240,
    "Cap": 270,
    "Aqu": 300,
    "Pis": 330,
}

PLANET_ROSTER = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
]

ASPECTS = {"square", "opposition", "conjunction", "trine", "sextile"}
TRANSIT_PLANETS = {
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
}

# Planet-specific cooldowns (days before same aspect can trigger again).
# Outer planets move slowly, so they need longer cooldowns to avoid repetition.
# Enforced in compute_daily() via _passes_cooldown(), backed by the
# transit_cooldowns table (supabase/migrations/0006_transit_cooldowns.sql).
PLANET_COOLDOWNS = {
    "Moon": 3,  # Moon moves fast (~13°/day)
    "Sun": 14,  # Sun moves ~1°/day
    "Mercury": 10,  # Fast inner planet
    "Venus": 10,  # Fast inner planet
    "Mars": 14,  # Moderate speed
    "Jupiter": 30,  # Slow outer planet
    "Saturn": 45,  # Very slow
    "Uranus": 90,  # Glacially slow - should only trigger once per season
    "Neptune": 90,  # Glacially slow
    "Pluto": 90,  # Glacially slow
}

# Maximum orb allowed for each transit planet to be considered "active".
# Tighter orbs for slow-moving planets to prevent weeks of repetition.
MAX_ORBS = {
    "Moon": 3.0,  # Moon aspects are brief
    "Sun": 2.0,  # ~2 days effective
    "Mercury": 2.0,
    "Venus": 2.0,
    "Mars": 2.0,
    "Jupiter": 1.5,
    "Saturn": 1.5,
    "Uranus": 1.0,  # Outer planets need very tight orbs
    "Neptune": 1.0,
    "Pluto": 1.0,
}

# Transit intensity tiers for categorization.
MAJOR_TRANSITS = {"Pluto", "Neptune", "Uranus", "Saturn"}  # Life-altering events
MODERATE_TRANSITS = {"Jupiter", "Mars", "Sun"}  # Significant daily influences
MINOR_TRANSITS = {"Moon", "Mercury", "Venus"}  # Subtle daily ripples


def create_supabase_client() -> Client:
    """Instantiate a Supabase client using env vars."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Set them in .env."
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def build_natal_subject(
    name: str,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    lat: float,
    lng: float,
    tz_str: str,
):
    """Build the natal AstrologicalSubject from resolved birth data."""
    return AstrologicalSubjectFactory.from_birth_data(
        name=name,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        lat=lat,
        lng=lng,
        tz_str=tz_str,
        online=False,
    )


def build_transit_subject(natal_subject, target_date: date):
    """
    Build a transit subject for a given UTC date at 12:00.
    Uses the natal location/timezone for consistency.
    """
    iso = datetime(
        target_date.year,
        target_date.month,
        target_date.day,
        12,
        0,
        tzinfo=ZoneInfo("UTC"),
    ).isoformat()

    return AstrologicalSubjectFactory.from_iso_utc_time(
        name=f"Transit {target_date.isoformat()}",
        iso_utc_time=iso,
        lng=natal_subject.lng,
        lat=natal_subject.lat,
        tz_str=natal_subject.tz_str,
        online=False,
    )


def get_abs_degree(sign_abbr: str, degree: float) -> float:
    """Convert relative sign degree (e.g., Virgo 19.7) to absolute (e.g., 169.7)."""
    abbr = sign_abbr[:3].title()
    return ZODIAC_OFFSETS.get(abbr, 0) + degree


def get_natal_house_of_transit(planet_abs_pos: float, natal_subject) -> int:
    """
    Determines which NATAL house a transit planet is in.
    Converts House Cusps to Absolute Degrees before comparing.
    """
    houses = getattr(natal_subject, "houses_list", None)
    if not houses or len(houses) != 12:
        # Fallback: build from individual house attributes with sign + position
        house_attrs = [
            "first_house",
            "second_house",
            "third_house",
            "fourth_house",
            "fifth_house",
            "sixth_house",
            "seventh_house",
            "eighth_house",
            "ninth_house",
            "tenth_house",
            "eleventh_house",
            "twelfth_house",
        ]
        houses = []
        for attr in house_attrs:
            h = getattr(natal_subject, attr, None)
            if h:
                houses.append({"name": h.name, "position": h.position, "sign": h.sign})
        if len(houses) != 12:
            return 1

    for i in range(12):
        h_curr = houses[i]
        start_abs = get_abs_degree(h_curr.get("sign", ""), h_curr["position"])

        h_next = houses[(i + 1) % 12]
        end_abs = get_abs_degree(h_next.get("sign", ""), h_next["position"])

        if start_abs < end_abs:
            if start_abs <= planet_abs_pos < end_abs:
                return i + 1
        else:
            if planet_abs_pos >= start_abs or planet_abs_pos < end_abs:
                return i + 1

    return 1  # Fallback


def house_number_for(point_house: Optional[str], houses_order: list) -> Optional[int]:
    """Return 1-based house number from house name, or None when missing."""
    if not point_house or not houses_order:
        return None
    try:
        return houses_order.index(point_house) + 1
    except ValueError:
        return None


def get_planet_for_today(target_date: date) -> str:
    """
    Rotate through PLANET_ROSTER by day-of-year to vary spotlight content.
    Jan 1 -> Sun, Jan 2 -> Moon, etc.
    """
    day_index = target_date.timetuple().tm_yday - 1  # 0-364
    planet_index = day_index % len(PLANET_ROSTER)
    return PLANET_ROSTER[planet_index]


def get_planet_sign_and_phase(planet_obj) -> Tuple[Optional[str], str]:
    """
    Return (sign_name, phase_string) for a transit planet.

    - sign_name is normalized to DB-friendly full names (e.g., "Aries") when possible.
    - phase_string is one of: "Retrograde" or "Direct" (Moon New/Full is handled separately).
    """
    if not planet_obj:
        return None, "Direct"

    # --- Sign ---
    raw_sign = getattr(planet_obj, "sign", None)
    sign_abbr = None
    if isinstance(raw_sign, str) and raw_sign.strip():
        sign_abbr = raw_sign[:3].title()
    sign_name = SIGN_MAP.get(sign_abbr, raw_sign) if raw_sign else None

    # --- Phase (retrograde vs direct) ---
    # Prefer Kerykeion's movement.retrograde if present.
    movement = getattr(planet_obj, "movement", None)
    retrograde_flag = getattr(movement, "retrograde", None) if movement is not None else None
    if retrograde_flag is not None:
        return sign_name, ("Retrograde" if bool(retrograde_flag) else "Direct")

    # Fallback: infer from a speed-like attribute if available.
    for attr in ("speed", "daily_speed", "daily_motion", "velocity", "motion"):
        val = getattr(planet_obj, attr, None)
        if isinstance(val, (int, float)):
            return sign_name, ("Retrograde" if val < 0 else "Direct")

    # Final fallback
    return sign_name, "Direct"


def _angular_separation_deg(a: float, b: float) -> float:
    """Smallest angular separation in degrees between two absolute positions (0..360)."""
    diff = abs((a - b) % 360.0)
    return min(diff, 360.0 - diff)


def categorize_transit_intensity(transit_planet: str, natal_planet: str, aspect_name: str) -> str:
    """
    Categorize transit by intensity level.

    Returns one of:
    - 'COLLISION' — Major life-altering transits (outer planets to personal planets)
    - 'TRANSIT'  — Significant but manageable influences
    - 'RIPPLE'   — Minor daily fluctuations (Moon/Mercury/Venus aspects)

    Priority logic:
    1. Outer planet (Pluto/Neptune/Uranus/Saturn) hitting personal planet → COLLISION
    2. Jupiter/Mars/Sun aspects → TRANSIT
    3. Moon/Mercury/Venus aspects → RIPPLE
    """
    # Personal planets that create significant impact when aspected
    personal_planets = {"Sun", "Moon", "Mercury", "Venus", "Mars"}

    # Check if this is an outer planet hitting a personal planet
    if transit_planet in MAJOR_TRANSITS:
        if natal_planet in personal_planets:
            return "COLLISION"
        else:
            return "TRANSIT"  # Outer-to-outer is less personal
    elif transit_planet in MODERATE_TRANSITS:
        return "TRANSIT"
    else:
        return "RIPPLE"


def _passes_cooldown(
    client: Optional[Client],
    user_id: Optional[str],
    transit_planet: str,
    collision_key: str,
    target_date: date,
) -> bool:
    """
    Mirrors the original generate_yearly_plan()'s cooldown_tracker, but reads
    cross-day history from the transit_cooldowns table instead of an in-memory
    dict, since a single /daily request only ever sees one date on its own.

    No client/user_id (e.g. an anonymous or not-yet-authenticated caller) ->
    no history to check, so everything passes, same as before this was wired
    up. Once a user_id is present, look up when this collision_key last fired
    for that user and compare against PLANET_COOLDOWNS.
    """
    if not client or not user_id:
        return True

    response = (
        client.table("transit_cooldowns")
        .select("last_fired_date")
        .eq("user_id", user_id)
        .eq("collision_key", collision_key)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    if not rows:
        return True

    last_fired = date.fromisoformat(rows[0]["last_fired_date"])
    cooldown_days = PLANET_COOLDOWNS.get(transit_planet, 7)
    return (target_date - last_fired).days >= cooldown_days


def _record_fired(
    client: Optional[Client], user_id: Optional[str], collision_key: str, target_date: date
) -> None:
    """Persist that collision_key fired today, so tomorrow's cooldown check sees it."""
    if not client or not user_id:
        return
    client.table("transit_cooldowns").upsert(
        {
            "user_id": user_id,
            "collision_key": collision_key,
            "last_fired_date": target_date.isoformat(),
        },
        on_conflict="user_id,collision_key",
    ).execute()


def compute_daily(
    natal_subject,
    target_date: date,
    user_id: Optional[str] = None,
    client: Optional[Client] = None,
) -> dict:
    """
    Run the single-day transit pipeline for one date: build the noon-UTC
    transit chart, filter aspects to transit-to-natal pairs within orb,
    pick the highest-priority one, classify its intensity, and fall back to
    the Walking spotlight when nothing qualifies.

    user_id (when provided) enables real per-user cooldown tracking via the
    transit_cooldowns table: a collision_key already fired within its
    PLANET_COOLDOWNS window is skipped, and whichever collision wins today
    gets its last_fired_date recorded for tomorrow's check. Without a
    user_id, cooldowns can't be checked (see _passes_cooldown) and this
    behaves as before. `client` lets callers that already hold a Supabase
    client (e.g. the daily-push cron) reuse it instead of opening a new one.

    Returns:
        { "type", "transit_planet", "natal_planet", "aspect", "orb",
          "sign", "phase", "house" }
    """
    if user_id and client is None:
        client = create_supabase_client()

    transit_subject = build_transit_subject(natal_subject, target_date)
    transit_chart = ChartDataFactory.create_transit_chart_data(natal_subject, transit_subject)

    major_aspects = []  # Outer planets (Pluto, Neptune, Uranus, Saturn)
    moderate_aspects = []  # Jupiter, Mars, Sun
    minor_aspects = []  # Moon, Mercury, Venus

    for asp in transit_chart.aspects:
        aspect_name = asp.aspect.lower()
        if aspect_name not in ASPECTS:
            continue

        is_p1_transit = "Transit" in asp.p1_owner
        is_p2_transit = "Transit" in asp.p2_owner

        if is_p1_transit and not is_p2_transit:
            t_planet, n_planet = asp.p1_name, asp.p2_name
        elif is_p2_transit and not is_p1_transit:
            t_planet, n_planet = asp.p2_name, asp.p1_name
        else:
            # Skip transit-transit or natal-natal aspects
            continue

        if t_planet not in TRANSIT_PLANETS or n_planet not in TRANSIT_PLANETS:
            continue

        # Check orb tightness - skip wide orbs
        orb_value = getattr(asp, "orb", None)
        if orb_value is None:
            # Fallback: try to get orb from different attribute names
            orb_value = getattr(asp, "orbit", None) or getattr(asp, "diff", 10.0)

        max_allowed_orb = MAX_ORBS.get(t_planet, 2.0)
        if abs(orb_value) > max_allowed_orb:
            continue  # Skip - aspect is too wide to be significant

        collision_key = f"{t_planet} {aspect_name} {n_planet}"
        if not _passes_cooldown(client, user_id, t_planet, collision_key, target_date):
            continue  # Still on cooldown

        aspect_data = (t_planet, n_planet, aspect_name, collision_key, orb_value)

        # Sort into priority buckets
        if t_planet in MAJOR_TRANSITS:
            major_aspects.append(aspect_data)
        elif t_planet in MODERATE_TRANSITS:
            moderate_aspects.append(aspect_data)
        else:
            minor_aspects.append(aspect_data)

    # Select the highest-priority aspect available.
    # Major transits suppress minor ones (if Pluto is active, skip Moon noise).
    valid_collision = None
    if major_aspects:
        major_aspects.sort(key=lambda x: abs(x[4]))
        valid_collision = major_aspects[0]
    elif moderate_aspects:
        moderate_aspects.sort(key=lambda x: abs(x[4]))
        valid_collision = moderate_aspects[0]
    elif minor_aspects:
        minor_aspects.sort(key=lambda x: abs(x[4]))
        valid_collision = minor_aspects[0]

    if valid_collision:
        t_planet, n_planet, aspect_name, collision_key, orb_val = valid_collision
        _record_fired(client, user_id, collision_key, target_date)
        intensity_tag = categorize_transit_intensity(t_planet, n_planet, aspect_name)

        t_planet_obj = getattr(transit_subject, t_planet.lower(), None)
        abs_pos = getattr(t_planet_obj, "abs_pos", None) if t_planet_obj else None
        house = (
            get_natal_house_of_transit(abs_pos, natal_subject)
            if isinstance(abs_pos, (int, float))
            else None
        )

        return {
            "type": intensity_tag,
            "transit_planet": t_planet,
            "natal_planet": n_planet,
            "aspect": aspect_name,
            "orb": orb_val,
            "sign": None,
            "phase": None,
            "house": house,
        }

    # Rotating spotlight fallback (no collision today)
    planet_name = get_planet_for_today(target_date)
    planet_obj = getattr(transit_subject, planet_name.lower(), None)
    sign_name, phase = get_planet_sign_and_phase(planet_obj)

    # Moon special-case: approximate New/Full via elongation with the Sun when possible.
    # (Only override when not retrograde.)
    if planet_name == "Moon" and phase != "Retrograde":
        sun_obj = getattr(transit_subject, "sun", None)
        moon_abs = getattr(planet_obj, "abs_pos", None)
        sun_abs = getattr(sun_obj, "abs_pos", None) if sun_obj else None
        if isinstance(moon_abs, (int, float)) and isinstance(sun_abs, (int, float)):
            sep = _angular_separation_deg(moon_abs, sun_abs)
            if sep <= 12.0:
                phase = "New"
            elif abs(180.0 - sep) <= 12.0:
                phase = "Full"

    abs_pos = getattr(planet_obj, "abs_pos", None) if planet_obj else None
    house = (
        get_natal_house_of_transit(abs_pos, natal_subject)
        if isinstance(abs_pos, (int, float))
        else None
    )

    return {
        "type": "WALKING",
        "transit_planet": planet_name,
        "natal_planet": None,
        "aspect": None,
        "orb": None,
        "sign": sign_name,
        "phase": phase,
        "house": house,
    }


def fetch_collision_content(
    client: Client, transit_planet: str, natal_planet: str, aspect: str
) -> Optional[dict]:
    """Fetch structured collision content."""
    response = (
        client.table("content_collisions")
        .select(
            "id, plain_title, morning_prompt, evening_prompt, mantra, intensity, "
            "do_command, the_friction, brutal_truth, dont_command"
        )
        .ilike("transit_planet", transit_planet)
        .ilike("natal_planet", natal_planet)
        .ilike("aspect", aspect)
        .execute()
    )
    if response.data:
        return random.choice(response.data)
    return None


def fetch_walking_content(
    client: Client, transit_planet: str, sign: Optional[str], phase: Optional[str]
) -> Optional[dict]:
    """Fetch structured walking content."""
    if not sign or not phase:
        return None
    response = (
        client.table("content_walking")
        .select(
            "id, plain_title, morning_prompt, evening_prompt, mantra, "
            "do_command, the_friction, brutal_truth, dont_command"
        )
        .ilike("transit_planet", transit_planet)
        .ilike("sign", sign)
        .ilike("phase", phase)
        .execute()
    )
    if response.data:
        return random.choice(response.data)
    return None


def resolve_walking_content(
    client: Client,
    transit_planet: str,
    sign_name: Optional[str],
    phase: Optional[str],
) -> Optional[dict]:
    """
    Look up walking content by planet + actual sign + phase.

    For Retrograde, if no row exists for that sign, fall back to sign 'All'
    (legacy/global retrograde rows).
    """
    if not phase:
        return None
    if sign_name:
        row = fetch_walking_content(client, transit_planet, sign_name, phase)
        if row:
            return row
    if phase == "Retrograde":
        return fetch_walking_content(client, transit_planet, "All", phase)
    return None


def build_editorial_paragraph(content: dict) -> str:
    """
    Weaves the 4 distinct edgy columns into a single magazine-style paragraph.
    Enforces a strict length limit to prevent breaking the physical PDF layout.
    """
    if not content:
        return "Insight currently unavailable."

    do_cmd = (content.get("do_command") or "").strip()
    friction = (content.get("the_friction") or "").strip()
    truth = (content.get("brutal_truth") or "").strip()
    dont_cmd = (content.get("dont_command") or "").strip()

    # Format the 'dont_command' so it flows perfectly after the word "Stop"
    if dont_cmd:
        dont_cmd = dont_cmd[0].lower() + dont_cmd[1:]
        if dont_cmd.endswith("."):
            dont_cmd = dont_cmd[:-1]
        dont_cmd = f"Stop {dont_cmd}."

    # Assemble the full paragraph
    full_paragraph = f"{do_cmd} {friction} {truth} {dont_cmd}".strip()

    # SAFETY GATE: 483 character limit for the physical layout box
    if len(full_paragraph) > 483:
        # Fallback: Drop the 'brutal_truth' sentence to guarantee it fits
        safe_paragraph = f"{do_cmd} {friction} {dont_cmd}".strip()
        return safe_paragraph

    # If the database columns are completely empty (legacy data), fallback to the old plain_title
    if not full_paragraph:
        return content.get("plain_title") or "Insight currently unavailable."

    return full_paragraph


def lookup_content(driver: dict) -> dict:
    """
    Fetch content for a compute_daily() driver: content_collisions for
    aspect days (COLLISION/TRANSIT/RIPPLE), content_walking for WALKING days.

    Returns:
        { "content_id", "headline", "body", "prompt" }
    """
    client = create_supabase_client()

    if driver["type"] == "WALKING":
        row = resolve_walking_content(
            client, driver["transit_planet"], driver.get("sign"), driver.get("phase")
        )
    else:
        row = fetch_collision_content(
            client, driver["transit_planet"], driver["natal_planet"], driver["aspect"]
        )

    if not row:
        return {
            "content_id": None,
            "headline": None,
            "body": "Insight currently unavailable.",
            "prompt": "What is this moment asking of you?",
        }

    return {
        "content_id": row.get("id"),
        "headline": row.get("plain_title"),
        "body": build_editorial_paragraph(row),
        # The content tables have morning_prompt/evening_prompt, not a single
        # "prompt" column. morning_prompt is the closer match to the PRD's one
        # reflective journal question, so that's what's mapped here until a
        # dedicated prompt column exists.
        "prompt": row.get("morning_prompt") or "What is this moment asking of you?",
    }
