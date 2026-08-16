"""
server.py — Python port of server.js for the Fitly planner.
Run with:  python server.py
Requires:  pip install flask requests
"""

import json
import math
import os
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, quote

import requests
from flask import Flask, request, jsonify, make_response, send_file, redirect, abort

import workout_engine

# ---------------------------------------------------------------------------
# Bootstrap: load .env files (same priority order as Node version)
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent


def _load_env_file(filename: str):
    path = ROOT / filename
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r'^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$', line)
        if not m or m.group(1) in os.environ:
            continue
        os.environ[m.group(1)] = re.sub(r"^['\"]|['\"]$", "", m.group(2))


_load_env_file(".env.local")
_load_env_file(".env.google.local")
_load_env_file(".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PORT = int(os.environ.get("PORT", 5173))
HOST = os.environ.get("HOST", "0.0.0.0")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI") or f"http://localhost:{PORT}/auth/google/callback"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE") == "true" or os.environ.get("FLASK_ENV") == "production"
MAX_BODY_BYTES = 1024 * 1024

_data_file_env = os.environ.get("FITLY_DATA_FILE")
DATA_FILE = (ROOT / _data_file_env).resolve() if _data_file_env else ROOT / "data" / "fitly-data.json"

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SECRET_KEY = (os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
SUPABASE_TABLE = (os.environ.get("SUPABASE_TABLE") or "fitly_users").strip() or "fitly_users"
SUPABASE_MIGRATE_FILE = os.environ.get("SUPABASE_MIGRATE_FILE") == "true"
SUPABASE_CONFIGURED = bool(SUPABASE_URL and SUPABASE_SECRET_KEY)

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------
users: dict = {}        # userId -> record
sessions: dict = {}     # sessionId -> {userId, createdAt}
oauth_states: dict = {} # state -> {createdAt}
auth_handoffs: dict = {}# handoff -> {sessionId, expiresAt}

persistence_mode = "file"

ai_runtime = {
    "status": "configured" if GEMINI_API_KEY else "not_configured",
    "lastError": None,
    "lastErrorAt": None,
    "retryUntil": 0,
    "retryAfterSeconds": 0,
}

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _random_token() -> str:
    return secrets.token_hex(32)


def _is_finite(value) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _number_or_none(value):
    if value in ("", None):
        return None
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def _safe_number(value, fallback=None):
    try:
        n = float(value)
        return n if math.isfinite(n) else fallback
    except (TypeError, ValueError):
        return fallback


def _round_number(value, decimals=0):
    factor = 10 ** decimals
    return round(value * factor) / factor

# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------
def _blank_user_record(user=None) -> dict:
    return {"createdAt": _now_iso(), "user": user, "profile": None, "preferences": None,
            "progressLogs": [], "trainingLogs": [], "activityLogs": [], "chat": []}


def _normalize_stored_user(record: dict) -> dict:
    r = record or {}
    return {
        "createdAt": r.get("createdAt") or _now_iso(),
        "user": r.get("user"),
        "profile": r.get("profile"),
        "preferences": r.get("preferences"),
        "progressLogs": (r.get("progressLogs") or [])[-180:],
        "trainingLogs": (r.get("trainingLogs") or [])[-60:],
        "activityLogs": (r.get("activityLogs") or [])[-1000:],
        "chat": (r.get("chat") or [])[-20:],
    }


def _supabase_headers(extra: dict = None) -> dict:
    headers = {"apikey": SUPABASE_SECRET_KEY, "Content-Type": "application/json", **(extra or {})}
    if not SUPABASE_SECRET_KEY.startswith("sb_"):
        headers["Authorization"] = f"Bearer {SUPABASE_SECRET_KEY}"
    return headers


def _supabase_request(endpoint: str, method="GET", headers=None, body=None):
    if not SUPABASE_CONFIGURED:
        raise RuntimeError("Supabase is not configured")
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    resp = requests.request(method, url, headers=_supabase_headers(headers or {}),
                            data=json.dumps(body) if body is not None else None, timeout=15)
    if not resp.ok:
        raise RuntimeError(f"Supabase request failed ({resp.status_code}): {resp.text[:240]}")
    if resp.status_code == 204:
        return None
    text = resp.text
    return json.loads(text) if text else None


def _record_to_supabase_row(uid: str, record: dict) -> dict:
    return {
        "id": uid,
        "created_at": record.get("createdAt") or _now_iso(),
        "user_data": record.get("user"),
        "profile": record.get("profile"),
        "preferences": record.get("preferences"),
        "progress_logs": record.get("progressLogs") or [],
        "training_logs": record.get("trainingLogs") or [],
        "activity_logs": record.get("activityLogs") or [],
        "chat": record.get("chat") or [],
    }


def _supabase_row_to_record(row: dict) -> dict:
    return _normalize_stored_user({
        "createdAt": row.get("created_at"),
        "user": row.get("user_data"),
        "profile": row.get("profile"),
        "preferences": row.get("preferences"),
        "progressLogs": row.get("progress_logs"),
        "trainingLogs": row.get("training_logs"),
        "activityLogs": row.get("activity_logs"),
        "chat": row.get("chat"),
    })


def _load_supabase_store():
    rows = _supabase_request(
        f"{SUPABASE_TABLE}?select=id,created_at,user_data,profile,preferences,progress_logs,training_logs,activity_logs,chat&limit=10000"
    )
    for row in (rows or []):
        if row.get("id"):
            users[str(row["id"])] = _supabase_row_to_record(row)


def _migrate_file_store_to_supabase():
    if not DATA_FILE.exists():
        return
    saved = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    records = list((saved.get("users") or {}).items())
    for uid, record in records:
        _supabase_request(
            f"{SUPABASE_TABLE}?on_conflict=id", method="POST",
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            body=_record_to_supabase_row(uid, _normalize_stored_user(record)),
        )
    if records:
        print(f"[fitly] Migrated {len(records)} user record(s) from the file store to Supabase.")


def _persist_user_record(user_id: str):
    if persistence_mode != "supabase":
        _persist_store()
        return
    record = users.get(user_id)
    if not record:
        return
    _supabase_request(
        f"{SUPABASE_TABLE}?on_conflict=id", method="POST",
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        body=_record_to_supabase_row(user_id, record),
    )


def _queue_user_persistence(user_id: str):
    try:
        _persist_user_record(user_id)
    except Exception as exc:
        print(f"[fitly] Supabase user save failed: {exc}")


def _append_chat(session: dict, user_text: str, assistant_text: str, user_id=None):
    if not session:
        return
    chat = list(session.get("chat") or [])
    chat.append({"text": str(user_text or ""), "type": "user"})
    chat.append({"text": str(assistant_text or ""), "type": "ai"})
    session["chat"] = chat[-20:]
    if user_id:
        _persist_user_record(user_id)


def _load_persistent_store():
    try:
        if not DATA_FILE.exists():
            return
        saved = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        for uid, record in (saved.get("users") or {}).items():
            users[uid] = _normalize_stored_user(record)
        for sid, record in (saved.get("sessions") or {}).items():
            if record.get("userId") and record["userId"] in users:
                sessions[sid] = record
    except Exception as exc:
        print(f"[fitly] Persistent store could not be loaded: {exc}")


def _persist_store():
    if persistence_mode == "supabase":
        return
    try:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = DATA_FILE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(
            {"version": 1, "savedAt": _now_iso(), "users": dict(users), "sessions": dict(sessions)},
            indent=2
        ), encoding="utf-8")
        tmp.replace(DATA_FILE)
    except Exception as exc:
        print(f"[fitly] Persistent store could not be saved: {exc}")


def _create_session_for_user(user: dict, forced_user_id=None) -> dict:
    user_id = str(forced_user_id or (user or {}).get("id") or f"guest:{_random_token()}")
    record = users.get(user_id) or _blank_user_record(user or None)
    if user:
        record["user"] = user
    users[user_id] = record
    session_id = _random_token()
    sessions[session_id] = {"userId": user_id, "createdAt": _now_iso()}
    if persistence_mode == "supabase":
        _queue_user_persistence(user_id)
    else:
        _persist_store()
    return {"id": session_id, "userId": user_id, "session": record}


def _initialize_store():
    global persistence_mode
    if SUPABASE_CONFIGURED:
        try:
            if SUPABASE_MIGRATE_FILE:
                _migrate_file_store_to_supabase()
            _load_supabase_store()
            persistence_mode = "supabase"
            print(f"[fitly] Persistence: Supabase ({SUPABASE_TABLE})")
            return
        except Exception as exc:
            print(f"[fitly] Supabase unavailable, using the local file store: {exc}")
    _load_persistent_store()
    persistence_mode = "file"
    print("[fitly] Persistence: local server file store")


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------
def _parse_cookies() -> dict:
    return {k.strip(): v.strip() for k, v in
            (part.split("=", 1) for part in (request.headers.get("Cookie") or "").split(";") if "=" in part)}


def _cookie_header(name: str, value: str, max_age=None, secure=False) -> str:
    parts = [f"{name}={quote(str(value), safe='')}", "Path=/", "HttpOnly", "SameSite=Lax"]
    if max_age is not None:
        parts.append(f"Max-Age={max_age}")
    if secure or COOKIE_SECURE:
        parts.append("Secure")
    return "; ".join(parts)


def _get_session() -> dict:
    cookies = _parse_cookies()
    sid = cookies.get("fitly_sid")
    sess = sessions.get(sid) if sid else None
    if sess and sess.get("userId"):
        return users.get(sess["userId"])
    return None


def _get_session_user_id():
    cookies = _parse_cookies()
    sid = cookies.get("fitly_sid")
    return (sessions.get(sid) or {}).get("userId") if sid else None


def _get_or_create_session() -> dict:
    cookies = _parse_cookies()
    existing = sessions.get(cookies.get("fitly_sid")) if cookies.get("fitly_sid") else None
    if existing and existing.get("userId") and existing["userId"] in users:
        return {"id": cookies["fitly_sid"], "userId": existing["userId"],
                "session": users[existing["userId"]], "newSession": False}
    stored_guest = cookies.get("fitly_guest_id", "")
    guest_id = stored_guest if re.match(r'^guest:[a-f0-9]{64}$', stored_guest) else None
    created = _create_session_for_user(None, guest_id or f"guest:{_random_token()}")
    return {"id": created["id"], "userId": created["userId"], "session": created["session"],
            "newSession": True, "guestId": created["userId"], "setGuestCookie": not bool(guest_id)}


def _session_set_cookie_headers(session_info: dict) -> list:
    cookies = []
    if session_info.get("newSession"):
        cookies.append(_cookie_header("fitly_sid", session_info["id"], max_age=60 * 60 * 24 * 30))
    if session_info.get("setGuestCookie") and session_info.get("guestId"):
        cookies.append(_cookie_header("fitly_guest_id", session_info["guestId"], max_age=60 * 60 * 24 * 365))
    return cookies


# ---------------------------------------------------------------------------
# JSON response helper
# ---------------------------------------------------------------------------
def _send_json(payload: dict, status: int = 200, extra_headers: dict = None, set_cookies: list = None):
    resp = make_response(json.dumps(payload), status)
    resp.headers["Content-Type"] = "application/json; charset=utf-8"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    for k, v in (extra_headers or {}).items():
        resp.headers[k] = v
    for cookie in (set_cookies or []):
        resp.headers.add("Set-Cookie", cookie)
    return resp


# ---------------------------------------------------------------------------
# Profile / preferences normalisers
# ---------------------------------------------------------------------------
def _normalize_profile(profile: dict) -> dict:
    p = profile or {}
    return {
        "age": _number_or_none(p.get("age")),
        "weight": _number_or_none(p.get("weight")),
        "height": _number_or_none(p.get("height")),
        "sex": p.get("sex") if p.get("sex") in ("male", "female", "unspecified") else "unspecified",
        "activity": p.get("activity") if p.get("activity") in ("sedentary", "light", "moderate", "very", "extreme") else "moderate",
        "experience": p.get("experience") if p.get("experience") in ("beginner", "intermediate", "advanced") else "beginner",
        "fitnessLevel": str(p.get("fitnessLevel") or "")[:120],
        "equipment": str(p.get("equipment") or "")[:120],
        "exercisePreferences": str(p.get("exercisePreferences") or "")[:500],
        "exercisesToAvoid": str(p.get("exercisesToAvoid") or "")[:500],
        "currentLifts": str(p.get("currentLifts") or "")[:500],
        "split": p.get("split") if p.get("split") in ("auto", "full_body", "upper_lower", "ppl") else "auto",
        "trainingDays": _number_or_none(p.get("trainingDays")),
        "sessionMinutes": _number_or_none(p.get("sessionMinutes")),
        "dailySteps": _number_or_none(p.get("dailySteps")),
        "bodyFat": _number_or_none(p.get("bodyFat")),
        "targetBodyFat": _number_or_none(p.get("targetBodyFat")),
        "diet": p.get("diet") if p.get("diet") in ("omnivore", "vegetarian", "vegan") else "omnivore",
        "sleepHours": _number_or_none(p.get("sleepHours")),
        "sleepQuality": p.get("sleepQuality") if p.get("sleepQuality") in ("poor", "okay", "good") else "okay",
        "soreness": _number_or_none(p.get("soreness")),
        "fatigue": _number_or_none(p.get("fatigue")),
        "stress": _number_or_none(p.get("stress")),
        "restingHeartRate": _number_or_none(p.get("restingHeartRate")),
        "healthIssues": str(p.get("healthIssues") or "")[:1000],
        "surgery": str(p.get("surgery") or "")[:1000],
        "goal": p.get("goal") if p.get("goal") in ("Bulking", "Fat loss", "Strength training") else "Strength training",
        "consent": bool(p.get("consent")),
        "termsAccepted": bool(p.get("termsAccepted")),
        "termsAcceptedAt": str(p.get("termsAcceptedAt") or _now_iso())[:80] if p.get("termsAccepted") else None,
        "updatedAt": _now_iso(),
    }


def _normalize_preferences(preferences: dict) -> dict:
    p = preferences or {}
    return {
        "goal": str(p.get("goal") or "Build strength"),
        "food": str(p.get("food") or "South Indian"),
        "equipment": str(p.get("equipment") or "Dorm-friendly"),
        "budget": str(p.get("budget") or "₹2,500 / month"),
    }


# ---------------------------------------------------------------------------
# Nutrition
# ---------------------------------------------------------------------------
_ACTIVITY_FACTORS = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55, "very": 1.725, "extreme": 1.9}


def _calculate_nutrition(profile: dict):
    p = _normalize_profile(profile)
    if not all([p["age"], p["weight"], p["height"]]):
        return None
    sex_adj = 5 if p["sex"] == "male" else -161 if p["sex"] == "female" else -78
    bmr = 10 * p["weight"] + 6.25 * p["height"] - 5 * p["age"] + sex_adj
    activity_factor = _ACTIVITY_FACTORS.get(p["activity"], _ACTIVITY_FACTORS["moderate"])
    tdee = bmr * activity_factor
    goal = p["goal"]
    multiplier = 1.1 if goal == "Bulking" else 0.85 if goal == "Fat loss" else 1
    target_calories = round(tdee * multiplier)
    protein_range = [1.8, 2.4] if goal == "Fat loss" else [1.6, 2.2]
    protein_min = _round_number(p["weight"] * protein_range[0])
    protein_max = _round_number(p["weight"] * protein_range[1])
    protein_target = round((protein_min + protein_max) / 2)
    fat_min = _round_number(p["weight"] * 0.6)
    fat_max = _round_number(p["weight"] * 1.0)
    fat_target = round(p["weight"] * 0.8)
    carbs_target = max(0, round((target_calories - protein_target * 4 - fat_target * 9) / 4))
    fiber_target = round(target_calories * 14 / 1000)
    if goal == "Bulking":
        weight_trend = {"direction": "gain", "min": _round_number(p["weight"] * 0.001, 2), "max": _round_number(p["weight"] * 0.0025, 2), "unit": "kg/week"}
    elif goal == "Fat loss":
        weight_trend = {"direction": "loss", "min": _round_number(p["weight"] * 0.005, 2), "max": _round_number(p["weight"] * 0.01, 2), "unit": "kg/week"}
    else:
        weight_trend = {"direction": "maintain", "min": 0, "max": 0, "unit": "kg/week"}
    height_m = p["height"] / 100
    bmi = _round_number(p["weight"] / (height_m ** 2), 1)
    lean_mass = _round_number(p["weight"] * (1 - p["bodyFat"] / 100), 1) if p["bodyFat"] else None
    fat_mass = _round_number(p["weight"] - lean_mass, 1) if lean_mass is not None else None
    target_bf = p["targetBodyFat"] or (max(10, p["bodyFat"] - 5) if goal == "Fat loss" and p["bodyFat"] else None)
    goal_weight = _round_number(lean_mass / (1 - target_bf / 100), 1) if lean_mass is not None and target_bf and target_bf < 100 else None
    return {
        "bmr": round(bmr), "tdee": round(tdee), "activityFactor": activity_factor,
        "targetCalories": target_calories, "goal": goal,
        "maintenanceCalories": round(tdee),
        "bulkCalories": {"min": round(tdee * 1.05), "target": round(tdee * 1.1), "max": round(tdee * 1.15)},
        "cutCalories": {"min": round(tdee * 0.75), "target": round(tdee * 0.85), "max": round(tdee * 0.9)},
        "recompCalories": round(tdee),
        "protein": {"min": protein_min, "max": protein_max, "target": protein_target},
        "fat": {"min": fat_min, "max": fat_max, "target": fat_target},
        "carbs": {"target": carbs_target}, "fiber": {"target": fiber_target},
        "proteinPerMeal": {"min": _round_number(p["weight"] * 0.3), "max": _round_number(p["weight"] * 0.5)},
        "weightTrend": weight_trend, "bmi": bmi, "leanMass": lean_mass,
        "fatMass": fat_mass, "targetBodyFat": target_bf, "goalWeight": goal_weight,
        "estimateNote": "Starting estimate. Recheck your 7-day average weight after 2–3 weeks before adjusting by 100–200 kcal.",
    }


# ---------------------------------------------------------------------------
# Progress / training / activity log normalisers
# ---------------------------------------------------------------------------
def _normalize_progress_log(log: dict) -> dict:
    d = log or {}
    raw_date = d.get("date")
    try:
        dt = datetime.fromisoformat(str(raw_date)) if raw_date else datetime.now(timezone.utc)
    except Exception:
        dt = datetime.now(timezone.utc)
    return {
        "id": str(d.get("id") or _random_token())[:80],
        "date": dt.isoformat(),
        "weight": _number_or_none(d.get("weight")), "waist": _number_or_none(d.get("waist")),
        "chest": _number_or_none(d.get("chest")), "arms": _number_or_none(d.get("arms")),
        "legs": _number_or_none(d.get("legs")), "bodyFat": _number_or_none(d.get("bodyFat")),
        "calories": _number_or_none(d.get("calories")), "protein": _number_or_none(d.get("protein")),
        "steps": _number_or_none(d.get("steps")), "water": _number_or_none(d.get("water")),
        "sleepHours": _number_or_none(d.get("sleepHours")), "restingHeartRate": _number_or_none(d.get("restingHeartRate")),
        "sleepQuality": d.get("sleepQuality") if d.get("sleepQuality") in ("poor", "okay", "good") else None,
        "soreness": _number_or_none(d.get("soreness")), "fatigue": _number_or_none(d.get("fatigue")),
        "stress": _number_or_none(d.get("stress")), "workoutCompleted": bool(d.get("workoutCompleted")),
        "note": str(d.get("note") or "")[:500],
    }


def _normalize_training_log(log: dict) -> dict:
    d = log or {}
    raw_date = d.get("date")
    try:
        dt = datetime.fromisoformat(str(raw_date)) if raw_date else datetime.now(timezone.utc)
    except Exception:
        dt = datetime.now(timezone.utc)
    return {
        "id": str(d.get("id") or _random_token())[:80],
        "date": dt.isoformat(),
        "exercise": str(d.get("exercise") or "Main movement")[:100],
        "load": _number_or_none(d.get("load")), "reps": _number_or_none(d.get("reps")),
        "rpe": _number_or_none(d.get("rpe")),
    }


def _normalize_activity_log(log: dict) -> dict:
    d = log or {}
    raw_date = d.get("date")
    try:
        dt = datetime.fromisoformat(str(raw_date)) if raw_date else datetime.now(timezone.utc)
    except Exception:
        dt = datetime.now(timezone.utc)
    log_type = d.get("type") if d.get("type") in ("workout", "meal", "exercise", "event") else None
    data = d.get("data") if isinstance(d.get("data"), dict) else {}
    idx = d.get("index")
    dur = d.get("durationSeconds")
    kcal = d.get("kcal")
    return {
        "id": str(d.get("id") or _random_token())[:100],
        "type": log_type, "event": str(d.get("event") or "")[:80], "data": data,
        "date": dt.isoformat(), "day": str(d.get("day") or "")[:20],
        "meal": str(d.get("meal") or "")[:40], "exercise": str(d.get("exercise") or "")[:100],
        "index": int(idx) if _is_finite(idx) else None,
        "completed": bool(d.get("completed")),
        "durationSeconds": max(0, float(dur)) if _is_finite(dur) else None,
        "kcal": max(0, float(kcal)) if _is_finite(kcal) else None,
    }


# ---------------------------------------------------------------------------
# Progress analysis
# ---------------------------------------------------------------------------
def _average(values: list):
    usable = [v for v in values if _is_finite(v)]
    return sum(usable) / len(usable) if usable else None


def _analyze_progress(profile: dict, logs: list) -> dict:
    user_profile = _normalize_profile(profile)
    nutrition = _calculate_nutrition(user_profile)
    safe_logs = logs if isinstance(logs, list) else []
    sorted_logs = sorted([_normalize_progress_log(lg) for lg in safe_logs], key=lambda x: x["date"])
    weight_logs = [lg for lg in sorted_logs if _is_finite(lg.get("weight"))]
    recent_avg = _average([lg["weight"] for lg in weight_logs[-7:]])
    previous_avg = _average([lg["weight"] for lg in weight_logs[-14:-7]])
    weekly_change = _round_number(recent_avg - previous_avg, 2) if recent_avg is not None and previous_avg is not None else None
    target = nutrition.get("weightTrend") if nutrition else None
    action, adjustment = "hold", 0
    headline = "Keep collecting your baseline."
    message = "Log a few consistent weigh-ins and recovery check-ins so Fitly can adapt from trends instead of one-off numbers."
    if weekly_change is not None and target:
        abs_change = abs(weekly_change)
        direction = target["direction"]
        t_min, t_max = target["min"], target["max"]
        too_slow = (direction == "gain" and weekly_change < t_min * 0.7) or \
                   (direction == "loss" and weekly_change > -t_min * 0.7) or \
                   (direction == "maintain" and abs_change > 0.2)
        too_fast = (direction == "gain" and weekly_change > t_max * 1.3) or \
                   (direction == "loss" and weekly_change < -t_max * 1.3)
        if too_slow:
            action = "increase_activity_or_reduce" if direction == "loss" else "increase_calories"
            adjustment = -100 if direction == "loss" else 150
            headline = "The loss trend is slower than target." if direction == "loss" else "The gain trend is slower than target."
            message = ("Hold your routine for a few more days, then consider 100–200 fewer kcal or a small step increase if the 14-day trend stays flat."
                       if direction == "loss" else
                       "Consider adding about 100–200 kcal/day if your 14-day average keeps moving below the gain target.")
        elif too_fast:
            action = "reduce_calories"
            adjustment = 100 if direction == "loss" else -150
            headline = "The loss trend is faster than target." if direction == "loss" else "The gain trend is faster than target."
            message = ("Consider adding 100–200 kcal/day and review recovery if this pace continues."
                       if direction == "loss" else
                       "Consider reducing about 100–200 kcal/day to keep the gain controlled.")
        else:
            headline = "Your weight trend is in range."
            message = "Keep calories, steps, and training steady. The trend is more useful than any single weigh-in."
    latest = sorted_logs[-1] if sorted_logs else None
    sleep_hours = (latest or {}).get("sleepHours") if latest else user_profile.get("sleepHours")
    fatigue = (latest or {}).get("fatigue") if latest else user_profile.get("fatigue")
    soreness = (latest or {}).get("soreness") if latest else user_profile.get("soreness")
    recovery_state = "reduce" if (
        (sleep_hours is not None and _is_finite(sleep_hours) and float(sleep_hours) < 6.5) or
        (fatigue is not None and _is_finite(fatigue) and float(fatigue) >= 4) or
        (soreness is not None and _is_finite(soreness) and float(soreness) >= 4)
    ) else "train"
    recovery_message = ("Recovery looks limited today. Reduce volume, keep technique crisp, or choose a recovery session."
                        if recovery_state == "reduce" else
                        "Recovery signals look ready for your planned session.")
    return {
        "entries": len(sorted_logs),
        "recentAverage": _round_number(recent_avg, 1) if recent_avg is not None else None,
        "previousAverage": _round_number(previous_avg, 1) if previous_avg is not None else None,
        "weeklyChange": weekly_change, "action": action, "adjustment": adjustment,
        "headline": headline, "message": message, "recoveryState": recovery_state,
        "recoveryMessage": recovery_message, "latest": latest, "nutrition": nutrition,
    }


# ---------------------------------------------------------------------------
# Meal data
# ---------------------------------------------------------------------------
_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

_MEAL_SETS = {
    "South Indian": [
        ["Breakfast", "Idli with sambar & boiled eggs", "Idli · lentils · 2 eggs · coconut chutney", 390],
        ["Lunch", "Lemon rice power bowl", "Rice · chickpeas · cucumber · curd", 520],
        ["Snack", "Peanut butter banana toast", "Wholegrain bread · banana · peanut butter", 220],
        ["Dinner", "Paneer bhurji wraps", "Paneer · roti · peppers · mint chutney", 480],
    ],
    "North Indian": [
        ["Breakfast", "Besan chilla with curd", "Gram flour · onion · coriander · curd", 360],
        ["Lunch", "Rajma rice power bowl", "Kidney beans · basmati rice · cucumber raita", 510],
        ["Snack", "Roasted chana & fruit", "Chana · seasonal fruit · lime", 190],
        ["Dinner", "Paneer bhurji wraps", "Paneer · roti · peppers · mint chutney", 480],
    ],
    "Global mix": [
        ["Breakfast", "Greek yogurt oat bowl", "Yogurt · oats · banana · seeds", 410],
        ["Lunch", "Chickpea hummus wrap", "Chickpeas · roti · greens · tahini", 490],
        ["Snack", "Peanut butter banana toast", "Wholegrain bread · banana · peanut butter", 220],
        ["Dinner", "One-pan tofu rice", "Tofu · rice · peppers · soy ginger sauce", 470],
    ],
}

_MEAL_ROTATIONS = {
    "South Indian": {
        "Breakfast": [
            ["Idli with sambar & boiled eggs", "Idli - lentils - 2 eggs - coconut chutney", 390],
            ["Vegetable upma & boiled eggs", "Semolina - vegetables - 2 eggs - chutney", 400],
            ["Pesarattu with curd", "Green gram dosa - curd - ginger chutney", 380],
            ["Ragi dosa & paneer bhurji", "Ragi dosa - paneer - tomato chutney", 420],
            ["Ven pongal with sambar", "Rice - moong dal - sambar - cashews", 430],
            ["Appam with vegetable stew", "Appam - coconut vegetable stew - lentils", 410],
            ["Uthappam with sambar", "Vegetable uthappam - sambar - chutney", 400],
        ],
        "Lunch": [
            ["Lemon rice power bowl", "Rice - chickpeas - cucumber - curd", 520],
            ["Curd rice & beans poriyal", "Rice - curd - green beans - roasted peanuts", 500],
            ["Sambar rice & vegetable poriyal", "Rice - lentil sambar - seasonal vegetables", 530],
            ["Coconut rice & chickpea sundal", "Rice - coconut - chickpeas - cucumber salad", 540],
            ["Tomato rice with dal", "Rice - tomato - dal - carrot poriyal", 510],
            ["Tamarind rice with chana", "Tamarind rice - black chana - cabbage poriyal", 535],
            ["Millet rice bowl with rasam", "Millet - rasam - dal - mixed vegetables", 515],
        ],
        "Snack": [
            ["Peanut butter banana toast", "Wholegrain bread - banana - peanut butter", 220],
            ["Sundal & seasonal fruit", "Chickpea sundal - guava - lime", 210],
            ["Buttermilk & roasted peanuts", "Buttermilk - peanuts - cucumber", 200],
            ["Banana & peanut chikki", "Banana - peanut chikki - coconut water", 230],
            ["Corn chaat with curd", "Sweet corn - curd - onion - lime", 225],
            ["Coconut yogurt & fruit", "Coconut yogurt - papaya - seeds", 215],
            ["Roasted chana with lime", "Roasted chana - fruit - lime", 205],
        ],
        "Dinner": [
            ["Paneer bhurji wraps", "Paneer - roti - peppers - mint chutney", 480],
            ["Dosa with paneer filling", "Dosa - paneer - vegetables - chutney", 495],
            ["Tofu millet bowl", "Tofu - millet - vegetables - coconut chutney", 470],
            ["Chapati with vegetable kurma", "Chapati - mixed vegetables - dal - curd", 460],
            ["Lemon pepper paneer with rice", "Paneer - rice - vegetables - lemon pepper", 500],
            ["Vegetable kothu parotta", "Parotta - vegetables - tofu scramble - raita", 520],
            ["Sambar dosa with chutney", "Dosa - sambar - chutney - vegetable salad", 475],
        ],
    },
    "North Indian": {
        "Breakfast": [
            ["Besan chilla with curd", "Gram flour - onion - coriander - curd", 360],
            ["Aloo paratha with curd", "Whole wheat - potato - curd - mint chutney", 430],
            ["Oats chilla with paneer", "Oats - vegetables - paneer - chutney", 390],
            ["Moong dal chilla", "Moong dal - vegetables - curd - coriander", 370],
            ["Poha with peanuts & curd", "Flattened rice - peanuts - vegetables - curd", 380],
            ["Stuffed paneer paratha", "Whole wheat - paneer - vegetables - curd", 440],
            ["Vegetable dalia bowl", "Broken wheat - milk - fruit - seeds", 375],
        ],
        "Lunch": [
            ["Rajma rice power bowl", "Kidney beans - basmati rice - cucumber raita", 510],
            ["Chole with roti", "Chickpeas - roti - salad - curd", 530],
            ["Dal khichdi with vegetables", "Rice - moong dal - vegetables - curd", 500],
            ["Paneer tikka rice bowl", "Paneer - rice - peppers - mint yogurt", 550],
            ["Dal tadka with jeera rice", "Toor dal - jeera rice - salad - curd", 520],
            ["Soya keema roti bowl", "Soya mince - roti - peas - cucumber", 515],
            ["Kadhi rice with beans", "Kadhi - rice - green beans - salad", 495],
        ],
        "Snack": [
            ["Roasted chana & fruit", "Chana - seasonal fruit - lime", 190],
            ["Lassi & roasted makhana", "Curd lassi - makhana - cardamom", 230],
            ["Sprout chaat", "Moong sprouts - tomato - onion - lemon", 200],
            ["Peanut banana bowl", "Banana - peanuts - yogurt - cinnamon", 240],
            ["Makhana trail mix", "Makhana - almonds - raisins - seeds", 220],
            ["Chana cucumber chaat", "Chana - cucumber - tomato - lime", 195],
            ["Fruit & paneer cubes", "Seasonal fruit - paneer - black pepper", 215],
        ],
        "Dinner": [
            ["Paneer bhurji wraps", "Paneer - roti - peppers - mint chutney", 480],
            ["Dal makhani with roti", "Black dal - roti - salad - curd", 520],
            ["Palak paneer with rice", "Spinach - paneer - rice - cucumber", 505],
            ["Soya pulao with raita", "Soya chunks - rice - vegetables - raita", 490],
            ["Chole salad wraps", "Chickpeas - roti - salad - mint chutney", 465],
            ["Paneer tikka with roti", "Paneer - roti - peppers - salad", 500],
            ["Moong dal dosa with sabzi", "Moong dal dosa - seasonal vegetables - curd", 455],
        ],
    },
    "Global mix": {
        "Breakfast": [
            ["Greek yogurt oat bowl", "Yogurt - oats - banana - seeds", 410],
            ["Avocado egg toast", "Wholegrain toast - avocado - 2 eggs - tomato", 430],
            ["Berry overnight oats", "Oats - yogurt - berries - chia seeds", 390],
            ["Tofu scramble toast", "Tofu - wholegrain toast - spinach - tomato", 400],
            ["Banana protein pancakes", "Oats - banana - yogurt - seeds", 420],
            ["Peanut butter apple oats", "Oats - apple - peanut butter - cinnamon", 405],
            ["Hummus breakfast wrap", "Hummus - wholegrain wrap - greens - tofu", 415],
        ],
        "Lunch": [
            ["Chickpea hummus wrap", "Chickpeas - roti - greens - tahini", 490],
            ["Tofu quinoa power bowl", "Tofu - quinoa - greens - edamame", 520],
            ["Lentil tomato pasta", "Lentil pasta - tomato - spinach - parmesan", 535],
            ["Black bean burrito bowl", "Black beans - rice - corn - salsa", 510],
            ["Mediterranean couscous bowl", "Couscous - chickpeas - cucumber - hummus", 500],
            ["Tofu soba noodle bowl", "Tofu - soba noodles - vegetables - sesame", 525],
            ["Lentil avocado salad", "Lentils - avocado - greens - sourdough", 480],
        ],
        "Snack": [
            ["Peanut butter banana toast", "Wholegrain bread - banana - peanut butter", 220],
            ["Yogurt granola cup", "Greek yogurt - granola - berries - seeds", 230],
            ["Hummus & carrot sticks", "Hummus - carrots - cucumber - pita", 210],
            ["Apple with peanut butter", "Apple - peanut butter - pumpkin seeds", 225],
            ["Edamame & fruit", "Edamame - seasonal fruit - sea salt", 205],
            ["Cottage cheese berry cup", "Cottage cheese - berries - almonds", 240],
            ["Trail mix & orange", "Nuts - seeds - raisins - orange", 235],
        ],
        "Dinner": [
            ["One-pan tofu rice", "Tofu - rice - peppers - soy ginger sauce", 470],
            ["Paneer quinoa fajita bowl", "Paneer - quinoa - peppers - salsa", 510],
            ["Lentil curry with naan", "Lentils - naan - vegetables - yogurt", 500],
            ["Tofu stir-fry noodles", "Tofu - noodles - vegetables - sesame sauce", 490],
            ["Chickpea tomato pasta", "Chickpeas - pasta - tomato - spinach", 505],
            ["Baked tofu with sweet potato", "Tofu - sweet potato - broccoli - tahini", 480],
            ["Bean quesadilla & salad", "Beans - wholegrain tortilla - cheese - salad", 515],
        ],
    },
}

MEAL_ROTATION_VERSION = 2


def _get_date_info(value=None) -> dict:
    try:
        dt = datetime.fromisoformat(str(value)) if value else datetime.now(timezone.utc)
    except Exception:
        dt = datetime.now(timezone.utc)
    # Monday=0 … Sunday=6 matching JS (getDay()+6)%7
    day = _DAY_NAMES[dt.weekday()]
    label = dt.strftime("%A, %B %-d, %Y") if os.name != "nt" else dt.strftime("%A, %B %d, %Y").lstrip("0")
    return {"iso": dt.isoformat(), "day": day, "label": label}


def _vegan_sub(text: str) -> str:
    def _replace(m):
        w = m.group(0).lower()
        return "tofu" if ("paneer" in w or "egg" in w) else "coconut yogurt"
    return re.sub(r'boiled eggs|eggs|paneer|curd|yogurt|cheese', _replace, text, flags=re.IGNORECASE)


def _veg_sub(text: str) -> str:
    return re.sub(r'boiled eggs|eggs', 'tofu scramble', text, flags=re.IGNORECASE)


def _personalize_meal_set(food: str, diet: str = "omnivore", requested_date=None, variation: int = 0) -> list:
    selected_set = _MEAL_SETS.get(food) or _MEAL_SETS["South Indian"]
    rotation = _MEAL_ROTATIONS.get(food) or _MEAL_ROTATIONS["South Indian"]
    date_info = _get_date_info(requested_date) if requested_date else None
    base_day_index = max(0, _DAY_NAMES.index(date_info["day"])) if date_info else 0
    day_index = (base_day_index + max(0, int(variation or 0))) % 7
    result = []
    for meal, title, ingredients, kcal in selected_set:
        variant = (rotation.get(meal) or [[title, ingredients, kcal]])[day_index] if rotation.get(meal) else [title, ingredients, kcal]
        sel_title, sel_ingredients, sel_kcal = variant[0], variant[1], variant[2]
        if diet == "vegan":
            sel_title = _vegan_sub(sel_title)
            sel_ingredients = _vegan_sub(sel_ingredients)
        elif diet == "vegetarian":
            sel_title = _veg_sub(sel_title)
            sel_ingredients = re.sub(r'eggs', 'tofu', sel_ingredients, flags=re.IGNORECASE)
        result.append([meal, sel_title, sel_ingredients, sel_kcal])
    return result


# ---------------------------------------------------------------------------
# Plan builders
# ---------------------------------------------------------------------------
_BASE_PLANS = {
    "Monday": {"title": "Strong start", "type": "FULL BODY • AT HOME", "description": "A steady full-body circuit to start the week without draining your study battery.", "meta": ["06", "3", "130"]},
    "Tuesday": {"title": "Reset & recharge", "type": "FULL BODY • AT HOME", "description": "Move through a feel-good strength flow that works in your dorm room, no equipment needed.", "meta": ["06", "3", "120"]},
    "Wednesday": {"title": "Core & restore", "type": "CORE + MOBILITY • 20 MIN", "description": "A gentle midweek reset to loosen up after long library hours and keep your core switched on.", "meta": ["05", "2", "95"]},
    "Thursday": {"title": "Lower-body flow", "type": "LOWER BODY • AT HOME", "description": "Build a little heat with simple lower-body patterns and zero jumping around your flatmates.", "meta": ["07", "3", "145"]},
    "Friday": {"title": "Cardio burst", "type": "CARDIO • SMALL SPACE", "description": "A short, bright burst of movement to close the week with more energy than you started with.", "meta": ["05", "4", "160"]},
    "Saturday": {"title": "Long stretch", "type": "MOBILITY • EASY DAY", "description": "Slow things down with a longer stretch sequence for hips, shoulders, and a clearer head.", "meta": ["08", "1", "70"]},
    "Sunday": {"title": "Rest & reset", "type": "RECOVERY • YOUR PACE", "description": "A low-pressure recovery day. Walk, breathe, and let your body be ready for Monday.", "meta": ["04", "1", "45"]},
}


def _build_legacy_plan(preferences: dict, requested_date, profile: dict = None, progress_logs: list = None) -> dict:
    prefs = _normalize_preferences(preferences)
    user_profile = _normalize_profile(profile or {})
    has_profile_goal = bool(profile and profile.get("goal"))
    date = _get_date_info(requested_date)
    adaptation = _analyze_progress(user_profile, progress_logs or [])
    workout = dict(_BASE_PLANS.get(date["day"]) or _BASE_PLANS["Tuesday"])
    if has_profile_goal and user_profile["goal"] == "Bulking":
        workout.update({"title": "Progressive power", "type": "STRENGTH • CONTROLLED", "description": "A progressive strength session that gives you enough stimulus to build without taking over your whole day.", "meta": ["07", "4", "175"]})
    elif has_profile_goal and user_profile["goal"] == "Fat loss":
        workout.update({"title": "Lean & steady", "type": "FULL BODY • LOW IMPACT", "description": "A steady full-body session with simple movements and enough recovery to keep your energy useful.", "meta": ["06", "3", "140"]})
    elif (has_profile_goal and user_profile["goal"] == "Strength training") or prefs["goal"] == "Build strength":
        workout.update({"title": "Strength foundations", "type": "STRENGTH • AT HOME", "description": "Build a reliable strength base with controlled reps, simple progressions, and no complicated setup.", "meta": ["06", "3", "130"]})
    elif prefs["goal"] == "Get more energy":
        workout.update({"title": "Walk & reset" if date["day"] == "Sunday" else "Energy lift", "type": "LOW IMPACT • ENERGY", "description": "A bright, low-impact session designed to leave you more alert for classes, not wiped out."})
    elif prefs["goal"] == "Feel more flexible":
        workout.update({"title": "Open & unwind", "type": "MOBILITY • AT HOME", "description": "A slower mobility flow for shoulders, hips, and the stiffness that comes with long study sessions.", "meta": ["05", "2", "75"]})
    if adaptation["recoveryState"] == "reduce":
        workout.update({"title": "Recovery reset", "type": "RECOVERY • LOW IMPACT", "description": "A lighter session for a lower-energy day: mobility, breathing, and controlled movement without chasing fatigue.", "meta": ["04", "2", "65"]})
    elif user_profile.get("sessionMinutes") and user_profile["sessionMinutes"] <= 20:
        workout["description"] = f"{workout['description']} A focused {int(user_profile['sessionMinutes'])}-minute version keeps the essentials."
        workout["meta"] = ["04", "3", "90"]
    if prefs["equipment"] == "Gym access":
        workout["type"] = workout["type"].replace("AT HOME", "GYM OPTIONAL")
    meals = [{"meal": m, "title": t, "ingredients": i, "kcal": k, "done": idx < 2}
             for idx, (m, t, i, k) in enumerate(_personalize_meal_set(prefs["food"], user_profile["diet"], requested_date))]
    return {"date": date, "preferences": prefs, "profile": user_profile,
            "nutrition": _calculate_nutrition(user_profile), "adaptation": adaptation,
            "workout": workout, "meals": meals, "mealRotationVersion": MEAL_ROTATION_VERSION,
            "generatedAt": _now_iso(), "source": "server"}


def _build_plan(preferences: dict, requested_date, profile: dict = None, progress_logs: list = None, variation: int = 0) -> dict:
    prefs = _normalize_preferences(preferences)
    user_profile = _normalize_profile(profile or {})
    date = _get_date_info(requested_date)
    adaptation = _analyze_progress(user_profile, progress_logs or [])
    week = workout_engine.build_week(user_profile, prefs, adaptation)
    current_entry = next((e for e in week if e["day"] == date["day"]), None)
    regeneration = max(0, int(variation or 0))
    alternate_splits = {
        "Full body A": ["Full body B", "Upper A", "Push"],
        "Full body B": ["Full body A", "Lower A", "Pull"],
        "Upper A": ["Upper B", "Push", "Full body A"],
        "Upper B": ["Upper A", "Pull", "Full body B"],
        "Lower A": ["Lower B", "Legs", "Full body A"],
        "Lower B": ["Lower A", "Legs B", "Full body B"],
        "Push": ["Push B", "Upper A", "Full body A"],
        "Pull": ["Pull B", "Upper B", "Full body B"],
        "Legs": ["Legs B", "Lower A", "Full body A"],
        "Push B": ["Push", "Upper B", "Full body B"],
        "Pull B": ["Pull", "Upper A", "Full body A"],
        "Legs B": ["Legs", "Lower B", "Full body B"],
    }
    alt_split = None
    if regeneration and current_entry and current_entry.get("isTraining"):
        alts = alternate_splits.get(current_entry["split"], [])
        if alts:
            alt_split = alts[(regeneration - 1) % len(alts)]
    if alt_split:
        workout = workout_engine.build_workout(date["day"], alt_split, user_profile, prefs, adaptation)
    elif current_entry:
        workout = current_entry["workout"]
    else:
        workout = workout_engine.build_workout(date["day"], "Full body A", user_profile, prefs, adaptation)
    recovery_variant = None
    if not alt_split and regeneration and current_entry and not current_entry.get("isTraining"):
        rv_options = [
            {"title": "Mobility reset", "type": "RECOVERY - MOBILITY", "description": "A gentle mobility sequence to loosen your hips, shoulders, and back without adding fatigue.", "names": ["Gentle walk & breathing", "Cat-cow flow", "Open-book rotation", "Long-exhale reset"]},
            {"title": "Walk & restore", "type": "RECOVERY - EASY MOVEMENT", "description": "A relaxed walk and mobility session to support circulation, energy, and tomorrow's training.", "names": ["Easy walk", "90/90 hip switches", "Wall angels", "Box breathing"]},
            {"title": "Stretch & reset", "type": "RECOVERY - FLEXIBILITY", "description": "A calm full-body reset for a busy day. Keep every movement comfortable and conversational.", "names": ["Easy march", "Half-kneeling hip stretch", "Thread-the-needle", "Relaxed breathing"]},
        ]
        recovery_variant = rv_options[(regeneration - 1) % 3]
        exercises = [dict(ex, name=recovery_variant["names"][i] if i < len(recovery_variant["names"]) else ex["name"])
                     for i, ex in enumerate(workout["exercises"])]
        workout = {**workout, **recovery_variant, "meta": ["04", "2", "65"], "exercises": exercises}
    if (alt_split or recovery_variant) and current_entry:
        current_entry.update({"split": alt_split, "title": workout["title"], "type": workout["type"],
                              "focus": workout.get("focus"), "duration": workout.get("duration"), "workout": workout})
    meals = [{"meal": m, "title": t, "ingredients": i, "kcal": k, "done": idx < 2}
             for idx, (m, t, i, k) in enumerate(_personalize_meal_set(prefs["food"], user_profile["diet"], requested_date, regeneration))]
    return {"date": date, "preferences": prefs, "profile": user_profile,
            "nutrition": _calculate_nutrition(user_profile), "adaptation": adaptation,
            "workout": workout, "week": week, "meals": meals,
            "mealRotationVersion": MEAL_ROTATION_VERSION, "generatedAt": _now_iso(),
            "source": "server", "variation": regeneration}


def _save_plan_snapshot(session: dict, plan: dict, user_id: str):
    if not session or not user_id or not plan:
        return
    day = str((plan.get("date") or {}).get("day") or "")[:20]
    if not day:
        return
    log = _normalize_activity_log({
        "id": f"plan-{day}-{int(time.time() * 1000)}",
        "type": "event", "event": "plan_generated",
        "date": _now_iso(), "day": day, "data": {"day": day, "plan": plan},
    })
    existing = [lg for lg in (session.get("activityLogs") or [])
                if not (lg.get("type") == "event" and lg.get("event") == "plan_generated" and lg.get("day") == day)]
    session["activityLogs"] = (existing + [log])[-1000:]
    _persist_user_record(user_id)


# ---------------------------------------------------------------------------
# Gemini / AI
# ---------------------------------------------------------------------------
def _parse_model_json(text: str):
    cleaned = re.sub(r'^```json\s*', '', str(text or "").strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'^```\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def _ask_gemini(message: str, system_instruction: str, generation_config: dict = None):
    if not GEMINI_API_KEY:
        ai_runtime["status"] = "not_configured"
        return None
    if ai_runtime["status"] != "connected":
        ai_runtime["status"] = "configured"
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{quote(GEMINI_MODEL, safe='')}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": message}]}],
        "generationConfig": {"temperature": 0.65, "maxOutputTokens": 320, **(generation_config or {})},
    }
    resp = requests.post(endpoint, headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
                         json=payload, timeout=30)
    if not resp.ok:
        retry_after_header = resp.headers.get("retry-after")
        try:
            retry_after_seconds = min(300, int(retry_after_header)) if retry_after_header else (60 if resp.status_code == 429 else 0)
        except (TypeError, ValueError):
            retry_after_seconds = 60 if resp.status_code == 429 else 0
        ai_runtime["status"] = "rate_limited" if resp.status_code == 429 else "error"
        ai_runtime["lastError"] = "Gemini quota or rate limit reached" if resp.status_code == 429 else f"Gemini returned HTTP {resp.status_code}"
        ai_runtime["lastErrorAt"] = _now_iso()
        ai_runtime["retryAfterSeconds"] = retry_after_seconds
        ai_runtime["retryUntil"] = time.time() + retry_after_seconds if retry_after_seconds else 0
        err = RuntimeError(ai_runtime["lastError"])
        err.code = "AI_RATE_LIMITED" if resp.status_code == 429 else "AI_REQUEST_FAILED"
        err.status = resp.status_code
        err.retry_after_seconds = retry_after_seconds
        raise err
    result = resp.json()
    ai_runtime["status"] = "connected"
    ai_runtime["lastError"] = None
    ai_runtime["lastErrorAt"] = None
    ai_runtime["retryUntil"] = 0
    ai_runtime["retryAfterSeconds"] = 0
    parts = (result.get("candidates") or [{}])[0].get("content", {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts).strip() or None


def _build_gemini_plan(preferences: dict, requested_date, profile: dict = None, progress_logs: list = None, variation: int = 0):
    if not GEMINI_API_KEY:
        return None
    prefs = _normalize_preferences(preferences)
    user_profile = _normalize_profile(profile or {})
    date = _get_date_info(requested_date)
    instructions = ("You are Fitly, a practical student fitness planner. Return only valid JSON. "
                    "Create safe, realistic, budget-aware plans. Do not diagnose conditions or prescribe treatment. "
                    "Do not facilitate extreme calorie restriction, purging, compensatory exercise, or dangerous rapid weight loss. "
                    "Keep exercises low-impact unless the user explicitly asks otherwise.")
    adaptation = _analyze_progress(user_profile, progress_logs or [])
    regen = max(0, int(variation or 0))
    prompt = (
        f"Create a personalized plan for {date['day']}, {date['label']}. "
        f"This is regeneration version {regen}; choose meaningfully different exercises, workout title, meals, and ingredients "
        f"from the previous version when the version is greater than zero. "
        f"Preferences: {json.dumps(prefs)}. User profile: {json.dumps(user_profile)}. "
        f"Progress adaptation: {json.dumps(adaptation)}. "
        f"Return exactly this JSON shape: {{\"workout\":{{\"title\":\"string\",\"type\":\"string\","
        f"\"description\":\"string\",\"meta\":[\"exercises\",\"rounds\",\"kcal\"]}},"
        f"\"meals\":[{{\"meal\":\"Breakfast|Lunch|Snack|Dinner\",\"title\":\"string\","
        f"\"ingredients\":\"short ingredient list\",\"kcal\":0}}]}}. "
        f"Use the {user_profile['goal']} focus, four meals, familiar {prefs['food']} food, "
        f"ingredients that fit {prefs['budget']}, and {prefs['equipment']} constraints. "
        f"This is the {date['day']} menu: vary the dishes and ingredients by weekday and do not repeat a generic identical menu every day. "
        f"Respect {user_profile['experience']} experience, a {int(user_profile.get('sessionMinutes') or 30)}-minute session, "
        f"and the {user_profile['diet']} diet; do not include animal products for vegan users. "
        f"If health issues or surgery history are present, keep the plan conservative and explicitly encourage professional clearance."
    )
    text = _ask_gemini(prompt, instructions, {"responseMimeType": "application/json", "maxOutputTokens": 850})
    generated = _parse_model_json(text)
    if not generated or not generated.get("workout") or not isinstance(generated.get("meals"), list) or len(generated["meals"]) < 4:
        return None
    fallback = _build_plan(prefs, requested_date, user_profile, progress_logs, variation)
    fw = fallback["workout"]
    gw = generated["workout"]
    meta = [str(m) for m in gw["meta"][:3]] if isinstance(gw.get("meta"), list) else fw["meta"]
    merged_workout = {**fw, **gw, "exercises": fw["exercises"], "warmup": fw["warmup"],
                      "cooldown": fw["cooldown"], "progression": fw["progression"],
                      "recovery": fw["recovery"], "weeklyVolume": fw["weeklyVolume"],
                      "tracking": fw["tracking"], "meta": meta}
    meals = [
        {"meal": m.get("meal") or fallback["meals"][i]["meal"],
         "title": m.get("title") or fallback["meals"][i]["title"],
         "ingredients": m.get("ingredients") or fallback["meals"][i]["ingredients"],
         "kcal": int(m.get("kcal") or fallback["meals"][i]["kcal"]),
         "done": i < 2}
        for i, m in enumerate(generated["meals"][:4])
    ]
    return {**fallback, "workout": merged_workout, "meals": meals,
            "mealRotationVersion": MEAL_ROTATION_VERSION, "generatedAt": _now_iso(),
            "profile": user_profile, "source": "gemini"}


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------
def _google_config_ready() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def _google_auth_url(state: str) -> str:
    params = urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    })
    return f"https://accounts.google.com/o/oauth2/v2/auth?{params}"


def _verify_google_credential(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise ValueError("Google client ID is not configured")
    resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={quote(credential, safe='')}", timeout=10)
    if not resp.ok:
        raise ValueError(f"Google credential verification returned {resp.status_code}")
    token = resp.json()
    if token.get("aud") != GOOGLE_CLIENT_ID:
        raise ValueError("Google credential audience mismatch")
    if token.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Google credential issuer mismatch")
    if int(token.get("exp", 0)) * 1000 < int(time.time() * 1000):
        raise ValueError("Google credential expired")
    if not token.get("sub") or not token.get("email"):
        raise ValueError("Google credential has no account identity")
    return {"id": token["sub"], "name": token.get("name") or token["email"],
            "email": token["email"], "picture": token.get("picture") or ""}


# ---------------------------------------------------------------------------
# Local AI fallback
# ---------------------------------------------------------------------------
def _local_reply(message: str, context: dict = None) -> str:
    context = context or {}
    lower = str(message or "").lower()
    food = (context.get("preferences") or {}).get("food") or "South Indian"
    if re.search(r'chest pain|faint|fainted|trouble breathing|severe pain|heart racing|emergency', lower, re.IGNORECASE):
        return "Please stop the workout and seek urgent medical help for those symptoms. Fitly cannot assess emergencies or replace a clinician."
    if re.search(r'purge|vomit|starve|not eat|eating disorder|binge|as little as possible', lower, re.IGNORECASE):
        return "I'm sorry you're dealing with this. I can't help plan extreme restriction or compensatory exercise. Please speak with a qualified healthcare professional or a trusted person today."
    progress_logs = context.get("progressLogs") or []
    if len(progress_logs) >= 14:
        weights = [float(lg["weight"]) for lg in progress_logs[-7:] if _is_finite(lg.get("weight"))]
        previous = [float(lg["weight"]) for lg in progress_logs[-14:-7] if _is_finite(lg.get("weight"))]
        if weights and previous:
            return f"Your recent 7-day average is {_average(weights):.1f} kg versus {_average(previous):.1f} kg before that. Use the trend, not one weigh-in, and I can help adjust the plan gradually."
    if "20" in lower or "short" in lower:
        return "Absolutely. I trimmed today to three rounds: squats, incline push-ups, and dead bugs. You'll be done in about 20 minutes."
    if "swap" in lower or "dinner" in lower or "vegetarian" in lower:
        return f"Try a one-pan chickpea pulao with cucumber raita. It pairs well with your {food} preferences and stays budget-friendly."
    if "prep" in lower or "15" in lower:
        return "Start with the rice bowl base: use pre-cooked beans, microwave rice, cucumber, and curd. Add lemon and chilli at the end."
    return "I'll keep it realistic: low-impact movement, familiar ingredients, and enough flexibility for a full student day. Want to change the workout, a meal, or the timing?"


# ---------------------------------------------------------------------------
# Training recommendation helper
# ---------------------------------------------------------------------------
def _training_recommendation(log: dict) -> str:
    if not log:
        return "Log a top set to get a recommendation."
    reps = log.get("reps") or 0
    rpe = log.get("rpe") or 10
    if reps >= 10 and rpe <= 8:
        return "Add a small load increase next time and keep the same rep range."
    if rpe <= 8:
        return f"Keep the load and aim for {int(reps) + 1} reps next time."
    return "Repeat the same load until the set feels closer to RPE 8. Technique first."


# ---------------------------------------------------------------------------
# Static file serving
# ---------------------------------------------------------------------------
_MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
}

_CSP_STATIC = ("default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; "
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
               "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; "
               "frame-src 'self' https://accounts.google.com/gsi/; "
               "connect-src 'self' https://accounts.google.com/gsi/ https://accounts.google.com; "
               "object-src 'none'; base-uri 'self'")

_CSP_404 = ("default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; "
            "object-src 'none'; base-uri 'self'")


def _serve_static(pathname: str):
    requested = "/index.html" if pathname == "/" else pathname
    file_path = (ROOT / ("." + requested)).resolve()
    data_file_resolved = DATA_FILE.resolve()
    root_str = str(ROOT.resolve())
    if (not (str(file_path).startswith(root_str + os.sep) or file_path == ROOT.resolve()) or
            file_path == data_file_resolved or
            not file_path.exists() or
            file_path.is_dir()):
        return _serve_404()
    ext = file_path.suffix.lower()
    mime = _MIME_TYPES.get(ext, "application/octet-stream")
    cache = "no-store" if ext in (".html", ".js", ".css") else "public, max-age=3600"
    file_bytes = file_path.read_bytes()
    import hashlib as _hl
    etag = '"' + _hl.md5(file_bytes).hexdigest()[:16] + '"'
    if_none_match = request.headers.get("If-None-Match", "")
    if if_none_match == etag:
        return make_response("", 304)
    resp = make_response(file_bytes)
    resp.headers["Content-Type"] = mime
    resp.headers["Cache-Control"] = cache
    resp.headers["ETag"] = etag
    resp.headers["Content-Security-Policy-Report-Only"] = _CSP_STATIC
    if file_path.name == "sw.js":
        resp.headers["Service-Worker-Allowed"] = "/"
    return resp


def _serve_404():
    not_found = ROOT / "404.html"
    if not not_found.exists():
        return make_response(json.dumps({"error": "Not found"}), 404,
                             {"Content-Type": "application/json; charset=utf-8"})
    resp = make_response(not_found.read_bytes(), 404)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["Content-Security-Policy-Report-Only"] = _CSP_404
    return resp


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.route("/auth/google")
def auth_google_start():
    if not _google_config_ready():
        return redirect("/?auth=not_configured")
    state = _random_token()
    oauth_states[state] = {"createdAt": time.time()}
    resp = redirect(_google_auth_url(state))
    resp.headers["Set-Cookie"] = _cookie_header("fitly_oauth_state", state, max_age=600)
    return resp


@app.route("/auth/google/callback")
def auth_google_callback():
    state = request.args.get("state") or ""
    cookies = _parse_cookies()
    if not state or state not in oauth_states or cookies.get("fitly_oauth_state") != state:
        return redirect("/?auth=invalid_state")
    oauth_states.pop(state, None)
    provider_error = request.args.get("error")
    if provider_error:
        return redirect(f"/?auth=denied&reason={quote(provider_error[:48], safe='')}")
    code = request.args.get("code")
    if not code:
        return redirect("/?auth=missing_code")
    failure_stage = "token_exchange"
    try:
        token_resp = requests.post("https://oauth2.googleapis.com/token",
                                   headers={"Content-Type": "application/x-www-form-urlencoded"},
                                   data={"code": code, "client_id": GOOGLE_CLIENT_ID,
                                         "client_secret": GOOGLE_CLIENT_SECRET,
                                         "redirect_uri": GOOGLE_REDIRECT_URI,
                                         "grant_type": "authorization_code"}, timeout=15)
        token_payload = token_resp.json() if token_resp.ok else {}
        if not token_resp.ok:
            raise RuntimeError(f"Google token exchange returned {token_payload.get('error') or token_resp.status_code}")
        failure_stage = "userinfo"
        user_resp = requests.get("https://openidconnect.googleapis.com/v1/userinfo",
                                 headers={"Authorization": f"Bearer {token_payload['access_token']}"}, timeout=10)
        if not user_resp.ok:
            raise RuntimeError(f"Google userinfo returned {user_resp.status_code}")
        gu = user_resp.json()
        signed_in_user = {"id": gu["sub"], "name": gu.get("name") or gu["email"],
                          "email": gu["email"], "picture": gu.get("picture") or ""}
        created = _create_session_for_user(signed_in_user)
        handoff = _random_token()
        auth_handoffs[handoff] = {"sessionId": created["id"], "expiresAt": time.time() + 60}
        resp = redirect(f"/?signed_in=1&auth_handoff={quote(handoff, safe='')}")
        resp.headers.add("Set-Cookie", _cookie_header("fitly_sid", created["id"], max_age=60 * 60 * 24 * 30))
        resp.headers.add("Set-Cookie", _cookie_header("fitly_oauth_state", "", max_age=0))
        return resp
    except Exception as exc:
        print(f"[fitly] Google sign-in failed: {exc}")
        reason = "invalid_client" if "invalid_client" in str(exc) else failure_stage
        return redirect(f"/?auth=failed&stage={quote(reason, safe='')}")


@app.route("/api/health")
def api_health():
    ai_status = ai_runtime["status"]
    if not GEMINI_API_KEY:
        ai_status = "not_configured"
    elif ai_runtime["retryUntil"] > time.time():
        ai_status = "rate_limited"
    elif ai_status != "connected":
        ai_status = "configured"
        ai_runtime["status"] = "configured"
        ai_runtime["retryAfterSeconds"] = 0
    return _send_json({
        "ok": True, "now": _now_iso(), "aiConfigured": bool(GEMINI_API_KEY),
        "aiProvider": "gemini", "model": GEMINI_MODEL, "aiStatus": ai_status,
        "aiLastError": ai_runtime["lastError"], "aiRetryAfterSeconds": ai_runtime["retryAfterSeconds"],
        "persistence": persistence_mode, "supabaseConfigured": SUPABASE_CONFIGURED,
        "googleConfigured": _google_config_ready(), "googleClientId": GOOGLE_CLIENT_ID or None,
        "googleRedirectUri": GOOGLE_REDIRECT_URI,
    })


@app.route("/api/session")
def api_session():
    session = _get_session()
    headers = {}
    if not session:
        guest_id = _parse_cookies().get("fitly_guest_id", "")
        if re.match(r'^guest:[a-f0-9]{64}$', str(guest_id)):
            restored = _create_session_for_user(None, guest_id)
            session = restored["session"]
            headers = {"Set-Cookie": _cookie_header("fitly_sid", restored["id"], max_age=60 * 60 * 24 * 30)}
    return _send_json({
        "ok": True, "authenticated": bool(session and session.get("user")),
        "user": (session or {}).get("user"), "profile": (session or {}).get("profile"),
        "preferences": (session or {}).get("preferences"),
        "chat": (session or {}).get("chat") or [],
        "googleConfigured": _google_config_ready(),
    }, extra_headers=headers)


@app.route("/api/progress")
def api_progress_get():
    session = _get_session()
    logs = (session or {}).get("progressLogs") or []
    return _send_json({"ok": True, "logs": logs, "analysis": _analyze_progress((session or {}).get("profile") or {}, logs)})


@app.route("/api/training")
def api_training_get():
    session = _get_session()
    return _send_json({"ok": True, "logs": (session or {}).get("trainingLogs") or []})


@app.route("/api/activity")
def api_activity_get():
    session = _get_session()
    return _send_json({"ok": True, "logs": (session or {}).get("activityLogs") or []})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    sid = _parse_cookies().get("fitly_sid")
    if sid:
        sessions.pop(sid, None)
        _persist_store()
    return _send_json({"ok": True}, set_cookies=[_cookie_header("fitly_sid", "", max_age=0)])


@app.route("/api/auth/session", methods=["POST"])
def api_auth_session():
    body = request.get_json(force=True, silent=True) or {}
    handoff = str(body.get("handoff") or "").strip()
    entry = auth_handoffs.get(handoff)
    if not entry or entry["expiresAt"] < time.time():
        return _send_json({"error": "Sign-in handoff expired"}, 401)
    auth_handoffs.pop(handoff, None)
    session_meta = sessions.get(entry["sessionId"])
    session = users.get(session_meta["userId"]) if session_meta else None
    if not session or not session.get("user"):
        return _send_json({"error": "Sign-in session not found"}, 401)
    return _send_json({"ok": True, "authenticated": True, "user": session["user"],
                       "profile": session.get("profile"), "preferences": session.get("preferences"),
                       "chat": session.get("chat") or []},
                      set_cookies=[_cookie_header("fitly_sid", entry["sessionId"], max_age=60 * 60 * 24 * 30)])


@app.route("/api/auth/google", methods=["POST"])
def api_auth_google():
    body = request.get_json(force=True, silent=True) or {}
    credential = str(body.get("credential") or "").strip()
    if not credential:
        return _send_json({"error": "Google credential is required"}, 400)
    try:
        google_user = _verify_google_credential(credential)
        created = _create_session_for_user(google_user)
        return _send_json({"ok": True, "authenticated": True, "user": created["session"]["user"],
                           "profile": created["session"].get("profile"),
                           "preferences": created["session"].get("preferences"),
                           "chat": created["session"].get("chat") or []},
                          set_cookies=[_cookie_header("fitly_sid", created["id"], max_age=60 * 60 * 24 * 30)])
    except Exception as exc:
        print(f"[fitly] Google GIS sign-in failed: {exc}")
        return _send_json({"error": "Google sign-in could not be verified"}, 401)


@app.route("/api/onboarding", methods=["POST"])
def api_onboarding():
    body = request.get_json(force=True, silent=True) or {}
    if not body.get("profile") or not body["profile"].get("consent") or not body["profile"].get("termsAccepted"):
        return _send_json({"error": "Health consent and Terms acceptance are required before creating a plan"}, 400)
    session_info = _get_or_create_session()
    session_info["session"]["profile"] = _normalize_profile(body["profile"])
    if body.get("preferences"):
        session_info["session"]["preferences"] = _normalize_preferences(body["preferences"])
    requested_name = str((body.get("user") or {}).get("name") or "").strip()
    if requested_name:
        existing_user = session_info["session"].get("user")
        if existing_user:
            session_info["session"]["user"] = {**existing_user, "name": requested_name[:80]}
        else:
            session_info["session"]["user"] = {"name": requested_name[:80],
                                                "email": str((body.get("user") or {}).get("email") or "")[:160]}
    _persist_user_record(session_info["userId"])
    plan = None
    try:
        plan = _build_gemini_plan(body.get("preferences") or {}, body.get("date"),
                                  session_info["session"]["profile"],
                                  session_info["session"].get("progressLogs") or [])
    except Exception:
        pass
    if not plan:
        plan = _build_plan(body.get("preferences") or {}, body.get("date"),
                           session_info["session"]["profile"],
                           session_info["session"].get("progressLogs") or [])
    return _send_json({"ok": True, "profile": session_info["session"]["profile"],
                       "user": session_info["session"].get("user"),
                       "preferences": session_info["session"].get("preferences"),
                       "plan": plan},
                      set_cookies=_session_set_cookie_headers(session_info))


@app.route("/api/preferences", methods=["POST"])
def api_preferences():
    body = request.get_json(force=True, silent=True) or {}
    session_info = _get_or_create_session()
    session_info["session"]["preferences"] = _normalize_preferences(body.get("preferences") or {})
    _persist_user_record(session_info["userId"])
    return _send_json({"ok": True, "preferences": session_info["session"]["preferences"]},
                      set_cookies=_session_set_cookie_headers(session_info))


@app.route("/api/progress", methods=["POST"])
def api_progress_post():
    body = request.get_json(force=True, silent=True) or {}
    session_info = _get_or_create_session()
    log = _normalize_progress_log(body.get("log") or body)
    measurable = [log.get(k) for k in ("weight", "steps", "calories", "waist", "chest", "arms", "legs", "bodyFat", "water")]
    if not any(_is_finite(v) for v in measurable):
        return _send_json({"error": "Add at least one body, activity, or nutrition measure"}, 400)
    logs = sorted(
        list(session_info["session"].get("progressLogs") or []) + [log],
        key=lambda x: x["date"]
    )[-180:]
    session_info["session"]["progressLogs"] = logs
    _persist_user_record(session_info["userId"])
    return _send_json({"ok": True, "log": log, "logs": logs,
                       "analysis": _analyze_progress(session_info["session"].get("profile") or {}, logs)},
                      set_cookies=_session_set_cookie_headers(session_info))


@app.route("/api/training", methods=["POST"])
def api_training_post():
    body = request.get_json(force=True, silent=True) or {}
    session_info = _get_or_create_session()
    log = _normalize_training_log(body.get("log") or body)
    if not all(_is_finite(log.get(k)) for k in ("load", "reps", "rpe")):
        return _send_json({"error": "Load, reps, and RPE are required"}, 400)
    logs = (list(session_info["session"].get("trainingLogs") or []) + [log])[-60:]
    session_info["session"]["trainingLogs"] = logs
    _persist_user_record(session_info["userId"])
    return _send_json({"ok": True, "log": log, "logs": logs, "recommendation": _training_recommendation(log)},
                      set_cookies=_session_set_cookie_headers(session_info))


@app.route("/api/activity", methods=["POST"])
def api_activity_post():
    body = request.get_json(force=True, silent=True) or {}
    session_info = _get_or_create_session()
    log = _normalize_activity_log(body.get("log") or body)
    if not log.get("type"):
        return _send_json({"error": "Activity type must be workout, meal, exercise, or event"}, 400)
    logs = (list(session_info["session"].get("activityLogs") or []) + [log])[-1000:]
    session_info["session"]["activityLogs"] = logs
    _persist_user_record(session_info["userId"])
    return _send_json({"ok": True, "log": log, "logs": logs},
                      set_cookies=_session_set_cookie_headers(session_info))


@app.route("/api/plan", methods=["POST"])
def api_plan():
    body = request.get_json(force=True, silent=True) or {}
    session = _get_session()
    user_id = _get_session_user_id()
    profile = body.get("profile") or (session or {}).get("profile") or {}
    progress_logs = (session or {}).get("progressLogs") or body.get("progressLogs") or []
    variation = max(0, int(body.get("variation") or 0))
    plan = None
    try:
        plan = _build_gemini_plan(body.get("preferences"), body.get("date"), profile, progress_logs, variation)
    except Exception as exc:
        print(f"[fitly] Gemini plan fallback: {exc}")
    if not plan:
        plan = _build_plan(body.get("preferences"), body.get("date"), profile, progress_logs, variation)
        _save_plan_snapshot(session, plan, user_id)
        return _send_json({"ok": True, "plan": plan, "source": "server-fallback"})
    _save_plan_snapshot(session, plan, user_id)
    return _send_json({"ok": True, "plan": plan})


@app.route("/api/chat", methods=["POST"])
def api_chat():
    body = request.get_json(force=True, silent=True) or {}
    if not str(body.get("message") or "").strip():
        return _send_json({"error": "Message is required"}, 400)
    instructions = (
        "You are Fitly, a practical student fitness planner. Give concise, supportive, culturally aware workout and food "
        "suggestions using the user profile, progress logs, recovery signals, and current plan. Respect the user's budget, "
        "equipment, food preferences, and schedule. Do not diagnose conditions or replace medical advice. Never facilitate "
        "extreme restriction, purging, compensatory exercise, or dangerous rapid weight loss. For chest pain, fainting, "
        "trouble breathing, severe pain, or other urgent symptoms, tell the user to stop and seek urgent medical help. "
        "Encourage qualified professional guidance for injuries, surgery recovery, eating disorders, or medical conditions. "
        "You can ONLY reply to queries related to workout, diet plans, and fitness. If the user asks about anything else, "
        "politely refuse to answer."
    )
    session = _get_session()
    user_id = _get_session_user_id()
    context = {**(body.get("context") or {}),
               "profile": body.get("profile") or (session or {}).get("profile") or (body.get("context") or {}).get("profile"),
               "progressLogs": (session or {}).get("progressLogs") or (body.get("context") or {}).get("progressLogs") or []}
    try:
        reply = _ask_gemini(json.dumps({"message": body["message"], "context": context}), instructions,
                            {"maxOutputTokens": 260})
        reply_text = reply or _local_reply(body["message"], context)
        _append_chat(session, body["message"], reply_text, user_id)
        return _send_json({"ok": True, "reply": reply_text, "source": "ai" if reply else "local",
                           "reason": None if reply else ai_runtime["status"],
                           "retryAfterSeconds": ai_runtime["retryAfterSeconds"] or 0})
    except Exception as exc:
        print(f"[fitly] Gemini fallback: {exc}")
        reply_text = _local_reply(body["message"], context)
        _append_chat(session, body["message"], reply_text, user_id)
        retry_after = getattr(exc, "retry_after_seconds", 0) or ai_runtime["retryAfterSeconds"] or 0
        reason = "rate_limited" if getattr(exc, "code", None) == "AI_RATE_LIMITED" else ai_runtime["status"]
        return _send_json({"ok": True, "reply": reply_text, "source": "local", "fallback": True,
                           "reason": reason, "retryAfterSeconds": retry_after})


@app.route("/api/<path:_>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
def api_not_found(_):
    if request.method == "OPTIONS":
        return _send_json({}, 204)
    if request.method not in ("GET", "POST"):
        return _send_json({"error": "Method not allowed"}, 405)
    return _send_json({"error": "API route not found"}, 404)


# ---------------------------------------------------------------------------
# Static file catch-all
# ---------------------------------------------------------------------------
@app.route("/", defaults={"pathname": "/"})
@app.route("/<path:pathname>")
def serve_static(pathname):
    if request.method not in ("GET", "HEAD"):
        return _send_json({"error": "Method not allowed"}, 405)
    return _serve_static("/" + pathname.lstrip("/"))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    _initialize_store()
    print(f"Fitly is running at http://{HOST}:{PORT}")
    ai_label = f"{GEMINI_MODEL} configured" if GEMINI_API_KEY else "local fallback (set GEMINI_API_KEY to enable live Gemini)"
    print(f"AI provider: {ai_label}")
    app.run(host=HOST, port=PORT, debug=False)
