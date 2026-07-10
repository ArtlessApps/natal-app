"""Synastry-lite compatibility between two natal charts (PRD §4.5).

Works on the serialized chart_json the app already stores (big3 + placements
with sign/position), so no chart re-computation or server-side chart storage
is needed. Reuses the same absolute-degree + angular-separation math the daily
engine uses. We only look at the handful of pairings the PRD calls out:
Sun-Sun, Moon-Moon, and the Venus-Mars cross (attraction axis).
"""

from typing import Optional

from engine import get_abs_degree, _angular_separation_deg, SIGN_MAP

# Classic aspect angles. Synastry uses generous orbs (relationships are felt
# well before the aspect is exact), so these are wider than the daily-transit
# orbs in engine.MAX_ORBS.
ASPECT_ANGLES = {
    "conjunction": 0.0,
    "sextile": 60.0,
    "square": 90.0,
    "trine": 120.0,
    "opposition": 180.0,
}
SYNASTRY_ORB = 8.0

# element per sign (for the "no major aspect" fallback insight)
ELEMENTS = {
    "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
    "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
    "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
    "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water",
}


def _full_sign(sign_abbr: str) -> str:
    return SIGN_MAP.get(sign_abbr[:3].title(), sign_abbr)


def _placement(chart: dict, planet: str) -> Optional[dict]:
    """Find a planet's placement (sign + position) in a chart_json."""
    for p in chart.get("placements", []):
        if p.get("planet", "").lower() == planet.lower():
            return p
    return None


def _abs_pos(chart: dict, planet: str) -> Optional[float]:
    p = _placement(chart, planet)
    if not p:
        return None
    return get_abs_degree(p.get("sign", ""), p.get("position", 0.0))


def _closest_aspect(sep: float) -> tuple[Optional[str], float]:
    """Return (aspect_name, orb) for the nearest aspect within SYNASTRY_ORB."""
    best_name, best_orb = None, None
    for name, angle in ASPECT_ANGLES.items():
        orb = abs(sep - angle)
        if orb <= SYNASTRY_ORB and (best_orb is None or orb < best_orb):
            best_name, best_orb = name, orb
    return best_name, (best_orb if best_orb is not None else 0.0)


# Copy per pairing. Tone: direct, warm, specific, never doom (PRD §5).
# Keyed by aspect; "none" is the graceful fallback when nothing's in orb.
_LUMINARY_COPY = {
    "sun_sun": {
        "conjunction": "Your core selves run on the same fuel — you get each other's drive instinctively, though you can also amplify each other's blind spots.",
        "sextile": "Your identities spark easily off each other. Low-friction encouragement; you make each other a little braver.",
        "trine": "Your core selves flow together — being around each other feels natural and validating, like you're already on the same page.",
        "square": "Your egos push against each other. That tension isn't a dealbreaker; it's the friction that keeps things from going stale — if you both stay curious.",
        "opposition": "You're opposite sides of the same coin. Fascinating and complementary, as long as you treat the difference as a balance, not a battle.",
        "none": "Your Suns don't make a tight aspect — your core drives run on separate tracks, which can be refreshing rather than competitive.",
    },
    "moon_moon": {
        "conjunction": "You soothe the same way and need the same things emotionally. Deep, instinctive comfort — home feels like home fast.",
        "sextile": "Your emotional rhythms cooperate. It's easy to read and reassure each other without much explaining.",
        "trine": "You feel safe with each other quickly — your inner weather matches, so comfort comes without effort.",
        "square": "Your emotional needs are out of sync in a way you'll both feel. Nameable, workable — but you'll have to actually name it.",
        "opposition": "You need opposite things when you're upset. Powerful once understood, frustrating when you assume the other reacts like you do.",
        "none": "Your Moons don't tightly aspect — your emotional styles are independent, so you'll each want to spell out what comfort looks like.",
    },
}

_VENUS_MARS_COPY = {
    "conjunction": "{a}'s Venus and {b}'s Mars sit right on top of each other — direct, magnetic attraction with little ambiguity about the pull.",
    "sextile": "{a}'s affection and {b}'s drive fit together easily — a warm, uncomplicated spark.",
    "trine": "{a}'s Venus flows with {b}'s Mars — desire and warmth line up naturally; chemistry that feels effortless.",
    "square": "{a}'s Venus and {b}'s Mars strike at an angle — charged, a little combustible, the kind of tension that reads as heat.",
    "opposition": "{a}'s Venus faces {b}'s Mars head-on — strong magnetic pull with a push-pull edge to negotiate.",
    "none": "{a}'s Venus and {b}'s Mars don't make a tight angle — attraction here is more slow-burn than instant spark.",
}


def _luminary_insight(chart_a: dict, chart_b: dict, planet: str, key: str, title: str) -> dict:
    a = _abs_pos(chart_a, planet)
    b = _abs_pos(chart_b, planet)
    if a is None or b is None:
        return {"title": title, "aspect": None,
                "body": _LUMINARY_COPY[key]["none"]}
    sep = _angular_separation_deg(a, b)
    aspect, orb = _closest_aspect(sep)
    body = _LUMINARY_COPY[key][aspect or "none"]
    return {"title": title, "aspect": aspect, "orb": round(orb, 1), "body": body}


def _venus_mars_insight(chart_a: dict, chart_b: dict, name_a: str, name_b: str) -> dict:
    a = _abs_pos(chart_a, "venus")
    b = _abs_pos(chart_b, "mars")
    title = f"{name_a}'s Venus & {name_b}'s Mars"
    if a is None or b is None:
        return {"title": title, "aspect": None,
                "body": _VENUS_MARS_COPY["none"].format(a=name_a, b=name_b)}
    sep = _angular_separation_deg(a, b)
    aspect, orb = _closest_aspect(sep)
    body = _VENUS_MARS_COPY[aspect or "none"].format(a=name_a, b=name_b)
    return {"title": title, "aspect": aspect, "orb": round(orb, 1), "body": body}


def compute_compat(chart_a: dict, chart_b: dict, name_a: str, name_b: str) -> dict:
    """Side-by-side Big 3 + 4 synastry-lite insights (PRD §4.5)."""
    insights = [
        _luminary_insight(chart_a, chart_b, "sun", "sun_sun", "Your Suns"),
        _luminary_insight(chart_a, chart_b, "moon", "moon_moon", "Your Moons"),
        _venus_mars_insight(chart_a, chart_b, name_a, name_b),
        _venus_mars_insight(chart_b, chart_a, name_b, name_a),
    ]
    return {
        "big3_a": chart_a.get("big3"),
        "big3_b": chart_b.get("big3"),
        "insights": insights,
    }
