"""
users.py — User account management, JWT auth, password hashing
Stores accounts in memory/users.json
"""
import json, os, uuid, hashlib, secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from cryptography.fernet import Fernet

# ── Paths ─────────────────────────────────────────────────────────
BASE_DIR       = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'memory'))
USERS_FILE     = os.path.join(BASE_DIR, 'users.json')
SECRET_FILE    = os.path.join(BASE_DIR, '.server_secret')

# ── Load / create server secrets ──────────────────────────────────
def _load_or_create_secrets() -> tuple[str, bytes]:
    """Returns (jwt_secret, fernet_key). Created once, then persisted."""
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, 'r') as f:
            data = json.load(f)
        return data['jwt_secret'], data['fernet_key'].encode()
    
    jwt_secret  = secrets.token_hex(32)
    fernet_key  = Fernet.generate_key().decode()
    with open(SECRET_FILE, 'w') as f:
        json.dump({'jwt_secret': jwt_secret, 'fernet_key': fernet_key}, f)
    return jwt_secret, fernet_key.encode()

JWT_SECRET, FERNET_KEY = _load_or_create_secrets()
fernet = Fernet(FERNET_KEY)

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days

# ── Tier limits ────────────────────────────────────────────────────
# Plan Tier Rules (in days for expiry, rate limits match slowapi format)
TIER_CONFIG = {
    "free":       { "keys": 3,   "days": 30,  "rate_limit": "100/day" },
    "pro":        { "keys": 10,  "days": 365, "rate_limit": "1000/day" },
    "enterprise": { "keys": 999, "days": None,"rate_limit": "1000000/day" },
    "admin":      { "keys": 999, "days": None,"rate_limit": "1000000/day" },
}

# ── File helpers ───────────────────────────────────────────────────
def load_users() -> dict:
    db = {}
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                db = json.load(f)
        except Exception:
            pass
            
    # Ensure admin account exists
    admin_email = "admin@aegis.com"
    if not any(u.get("email") == admin_email for u in db.values()):
        admin_id = f"usr_{uuid.uuid4().hex[:16]}"
        db[admin_id] = {
            "user_id":       admin_id,
            "email":         admin_email,
            "organization":  "Aegis Admin",
            "password_hash": hash_password("admin123"), # Default password
            "tier":          "admin",
            "created_at":    datetime.now(timezone.utc).isoformat(),
            "last_login":    None,
        }
        # Save immediately to ensure it persists
        tmp = USERS_FILE + ".tmp"
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)
        os.replace(tmp, USERS_FILE)
        
    return db

def save_users(db: dict) -> None:
    tmp = USERS_FILE + ".tmp"
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    os.replace(tmp, USERS_FILE)

# ── Password helpers ───────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False

# ── JWT ────────────────────────────────────────────────────────────
def create_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "iat":   datetime.now(timezone.utc),
        "exp":   datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ── Fernet encryption for raw keys ────────────────────────────────
def encrypt_key(raw_key: str) -> str:
    return fernet.encrypt(raw_key.encode()).decode()

def decrypt_key(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()

# ── User CRUD ──────────────────────────────────────────────────────
def signup_user(email: str, password: str, organization: str, tier: str = "free") -> dict:
    email = email.strip().lower()
    db    = load_users()

    if any(u.get("email") == email for u in db.values()):
        raise ValueError("Email already registered")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    user_id = f"usr_{uuid.uuid4().hex[:16]}"
    now     = datetime.now(timezone.utc).isoformat()

    record = {
        "user_id":       user_id,
        "email":         email,
        "organization":  organization,
        "password_hash": hash_password(password),
        "tier":          tier,
        "created_at":    now,
        "last_login":    None,
    }
    db[user_id] = record
    save_users(db)
    return {k: v for k, v in record.items() if k != "password_hash"}

def login_user(email: str, password: str) -> dict:
    email = email.strip().lower()
    db    = load_users()

    user = next((u for u in db.values() if u.get("email") == email), None)
    if not user or not verify_password(password, user.get("password_hash", "")):
        raise ValueError("Invalid email or password")

    # Update last login
    db[user["user_id"]]["last_login"] = datetime.now(timezone.utc).isoformat()
    save_users(db)

    token = create_jwt(user["user_id"], user["email"])
    return {
        "token":        token,
        "user_id":      user["user_id"],
        "email":        user["email"],
        "organization": user["organization"],
        "tier":         user["tier"],
    }

def get_user_by_id(user_id: str) -> Optional[dict]:
    db = load_users()
    u  = db.get(user_id)
    if not u:
        return None
    return {k: v for k, v in u.items() if k != "password_hash"}
