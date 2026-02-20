import json
import os
import secrets
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader

# Re-export encryption helpers and config so api.py has a single import
from users import encrypt_key, decrypt_key, TIER_CONFIG

API_KEY_NAME    = "x-api-key"
api_key_header  = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

API_KEYS_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'memory', 'api_keys.json')
)

# ── Tier config ────────────────────────────────────────────────────
# (Imported from users.py above)

# ── File helpers ───────────────────────────────────────────────────
def load_api_keys() -> dict:
    if not os.path.exists(API_KEYS_FILE):
        return {}
    try:
        with open(API_KEYS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[ERR] Failed to load api_keys.json: {e}")
        return {}

def save_api_keys(db: dict) -> None:
    """Atomic write: temp file → rename to avoid corruption on crash."""
    tmp = API_KEYS_FILE + ".tmp"
    try:
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)
        os.replace(tmp, API_KEYS_FILE)
    except Exception as e:
        print(f"[ERR] Failed to save api_keys.json: {e}")
        raise

# ── Key generation ─────────────────────────────────────────────────
def generate_api_key(email: str, organization: str, tier: str = "free") -> dict:
    """
    Create a new API key record.
    Returns: { "raw_key": "aegis-v_...", "hash": "<sha256>", "record": {...} }
    The raw_key is shown ONCE to the user and never stored.
    """
    if tier not in TIER_CONFIG:
        raise ValueError(f"Unknown tier: {tier}")

    raw_key  = f"aegis-v_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    client_id = f"usr_{uuid.uuid4().hex[:12]}"

    cfg = TIER_CONFIG[tier]
    now = datetime.now(timezone.utc)
    expires_at = (
        (now + timedelta(days=cfg["days"])).isoformat()
        if cfg["days"] is not None else None
    )

    record = {
        "client_id":     client_id,
        "email":         email,
        "organization":  organization,
        "tier":          tier,
        "status":        "active",
        "rate_limit":    cfg["rate_limit"],
        "created_at":    now.isoformat(),
        "expires_at":    expires_at,
        "last_used_at":  None,
        "request_count": 0,
    }

    # Persist immediately
    db = load_api_keys()
    db[key_hash] = record
    save_api_keys(db)

    return {"raw_key": raw_key, "hash": key_hash, "record": record}

# ── In-memory cache (hot-reloaded on miss) ─────────────────────────
api_keys_db: dict = load_api_keys()

# ── FastAPI dependency ─────────────────────────────────────────────
async def get_api_key(api_key_header: str = Security(api_key_header)) -> dict:
    global api_keys_db

    if not api_key_header:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="API key is missing. Add header: x-api-key")

    key_hash    = hashlib.sha256(api_key_header.encode()).hexdigest()
    tenant_info = api_keys_db.get(key_hash)

    # Hot-reload on cache miss (key may have been just generated)
    if not tenant_info:
        api_keys_db = load_api_keys()
        tenant_info = api_keys_db.get(key_hash)

    if not tenant_info:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Invalid API key")

    # Status check
    if tenant_info.get("status") != "active":
        st = tenant_info.get("status", "unknown")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"API key is {st}")

    # Expiry check
    expires_at = tenant_info.get("expires_at")
    if expires_at:
        expiry_dt = datetime.fromisoformat(expires_at)
        if datetime.now(timezone.utc) > expiry_dt:
            # Mark as expired in DB
            api_keys_db[key_hash]["status"] = "expired"
            save_api_keys(api_keys_db)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"API key expired on {expiry_dt.strftime('%Y-%m-%d')}")

    # Update usage stats (non-blocking best-effort)
    try:
        api_keys_db[key_hash]["last_used_at"]  = datetime.now(timezone.utc).isoformat()
        api_keys_db[key_hash]["request_count"] = tenant_info.get("request_count", 0) + 1
        save_api_keys(api_keys_db)
    except Exception:
        pass  # Never let stat tracking break the request

    return api_keys_db[key_hash]
