import sys
import os

# CRITICAL FIX for WSL/Linux Hangs
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["CUDA_VISIBLE_DEVICES"] = ""

import json
import hashlib
import uvicorn
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import asyncio

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Add src to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from core.system import AegisSystem
from auth import get_api_key, generate_api_key, load_api_keys, save_api_keys, TIER_CONFIG, encrypt_key, decrypt_key
from users import (
    signup_user, login_user, get_user_by_id,
    decode_jwt
)

# Initialize FastAPI
app = FastAPI(title="Aegis V - AI Security Sentry API", version="2.1")

# Allow Next.js frontend (any origin in dev; lock down in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Setup
def get_tenant_key(request: Request):
    api_key_header = request.headers.get("x-api-key")
    if api_key_header:
        return hashlib.sha256(api_key_header.encode()).hexdigest()
    from slowapi.util import get_remote_address
    return get_remote_address(request)

limiter = Limiter(key_func=get_tenant_key)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Tenant Manager
class AegisTenantManager:
    def __init__(self):
        self.tenants = {}

    def get_system(self, client_id: str) -> AegisSystem:
        if client_id not in self.tenants:
            self.tenants[client_id] = AegisSystem(client_id=client_id)
        return self.tenants[client_id]

# Initialize Tenant Manager
print("[API] Initializing Aegis Tenant Manager...")
tenant_manager = AegisTenantManager()

class ChatRequest(BaseModel):
    message: str

class SecurityResponse(BaseModel):
    allowed: bool
    response: str
    risk_score: int
    block_reason: str = None
    layer_1_safe: bool
    layer_2_safe: bool


# Mount Static Files (Frontend)
# Ensure the directory exists before mounting
static_dir = os.path.join(os.path.dirname(__file__), '..', 'client', 'web')
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    # Redirect root to our new UI
    return RedirectResponse(url="/static/index.html")

@app.get("/api/status")
def api_status():
    return {"status": "online", "system": "Aegis V"}

@app.get("/api/training-data")
@limiter.limit("20/minute")
def api_training_data(request: Request, tenant_info: dict = Depends(get_api_key)):
    """Returns training logs and antibody data for the dashboard."""
    client_id = tenant_info["client_id"]
    data = {"training_log": [], "antibodies": {}}
    
    # Needs to read from specific tenant memory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    tenant_memory_dir = os.path.join(base_dir, "memory", "clients", client_id)
    training_log_path = os.path.join(tenant_memory_dir, "training_data_log.json")
    antibodies_path = os.path.join(tenant_memory_dir, "antibodies.json")

    try:
        if os.path.exists(training_log_path):
            with open(training_log_path, "r", encoding="utf-8") as f:
                data["training_log"] = json.load(f)
    except Exception as e:
        print(f"[API-ERR] Failed to load training log for {client_id}: {e}")

    try:
        if os.path.exists(antibodies_path):
            with open(antibodies_path, 'r') as f:
                antibody_data = json.load(f)
                # Ensure patterns are included
                if 'patterns' not in antibody_data and 'vectors' in antibody_data:
                    # Backward compatibility: add empty patterns
                    antibody_data['patterns'] = [''] * len(antibody_data.get('vectors', []))
                data["antibodies"] = antibody_data
        else:
            print(f"[API-WARN] Antibodies file not found at {antibodies_path}")
    except Exception as e:
        print(f"[API-ERR] Failed to load antibodies for {client_id}: {e}")

    return data

@app.get("/api/stats")
@limiter.limit("60/minute")
def api_stats(request: Request, tenant_info: dict = Depends(get_api_key)):
    """Returns real-time system telemetry."""
    client_id = tenant_info["client_id"]
    aegis = tenant_manager.get_system(client_id)
    try:
        last_block = aegis.blockchain.get_latest_block()
        return {
            "antibodies": len(aegis.layer1.vectors),
            "chain_length": len(aegis.blockchain.chain),
            "last_hash": last_block.hash if last_block else "0x0",
            "l1_count": len(aegis.layer1.vectors), # Redundant but explicit
            "history_len": len(aegis.chat_history)
        }
    except Exception as e:
        print(f"[API-ERR] Stats failed for {client_id}: {e}")
        return {"error": str(e)}

@app.post("/api/reset")
@limiter.limit("2/minute")
def api_reset(request: Request, tenant_info: dict = Depends(get_api_key)):
    """Resets system state and memory."""
    client_id = tenant_info["client_id"]
    aegis = tenant_manager.get_system(client_id)
    aegis.reset_state()
    return {"status": "reset", "message": f"System memory and state cleared for {client_id}."}

@app.post("/v1/chat")
@limiter.limit("10/minute")
async def chat_endpoint(request: Request, chat_req: ChatRequest, tenant_info: dict = Depends(get_api_key)):
    """
    Main entry point for Chat.
    Returns standard JSON response including security metadata.
    """
    if not chat_req.message:
        raise HTTPException(status_code=400, detail="Empty message")

    client_id = tenant_info["client_id"]
    aegis = tenant_manager.get_system(client_id)

    # Process via Aegis
    # Note: process_prompt is async but returns a dict with a generator for stream.
    # For the API, we will consume the stream to return full text (unless we implement SSE).
    # For simplicity v1, we return full text.
    
    result = await aegis.process_prompt(chat_req.message)
    
    final_text = ""
    
    # If blocked, response is already in result["response"]
    if result["stage"] in ["BLOCKED_L1", "BLOCKED_L2", "WARN", "ERROR"]:
        final_text = result["response"]
    else:
        # If passes, consume the stream OR return the static response
        stream = result.get("response_generator")
        if stream:
            for chunk in stream:
                final_text += chunk['message']['content']
        else:
            # Fallback for non-streaming providers (LLMEngine default)
            final_text = result.get("response", "[System Error] No response generated.")

    return {
        "allowed": result["stage"] == "SUCCESS" or result["stage"] == "WARN", # Warn is allowed in Fail-Open
        "response": final_text,
        "risk_score": result["l2_score"],
        "block_reason": result["block_reason"],
        "layer_1_safe": result["l1_safe"],
        "layer_2_safe": result["l2_safe"],
        "latency_ms": result.get("latency_ms", 0.0)
    }

class FeedbackRequest(BaseModel):
    prompt: str
    expected_label: str  # "MALICIOUS" or "BENIGN"
    actual_decision: str  # "BLOCKED" or "ALLOWED"
    correct: bool

@app.post("/v1/feedback")
@limiter.limit("10/minute")
async def feedback_endpoint(request: Request, feedback_req: FeedbackRequest, tenant_info: dict = Depends(get_api_key)):
    """
    SUPERVISED LEARNING ENDPOINT
    
    Accepts ground truth labeled feedback from the test client.
    When the system makes a mistake (incorrect=true), this trains antibodies.
    
    Priority: Higher than autonomous training (ground truth is trusted).
    """
    if not feedback_req.prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
    
    client_id = tenant_info["client_id"]
    aegis = tenant_manager.get_system(client_id)
    
    # Only process false negatives (missed attacks)
    if not feedback_req.correct and feedback_req.expected_label == "MALICIOUS":
        # This is a MISSED ATTACK - train antibodies immediately
        print(f"\n[API-FEEDBACK] ⚠️  False Negative detected for {client_id}!")
        print(f"[API-FEEDBACK] Expected: {feedback_req.expected_label}, Got: {feedback_req.actual_decision}")
        
        # Route to Layer 3 supervised training
        await aegis.layer3.process_supervised_feedback(
            prompt=feedback_req.prompt,
            ground_truth_label=feedback_req.expected_label
        )
        
        return {
            "status": "trained",
            "message": "Supervised antibodies generated for missed attack",
            "ground_truth": feedback_req.expected_label
        }
    
    elif not feedback_req.correct and feedback_req.expected_label == "BENIGN":
        # False positive - Trigger Negative Learning (Pruning)
        print(f"\n[API-FEEDBACK] 🛑 False Positive detected! Triggering Negative Learning...")
        
        # Route to Layer 3 to prune bad antibodies
        await aegis.layer3.process_supervised_feedback(
            prompt=feedback_req.prompt,
            ground_truth_label=feedback_req.expected_label
        )
        
        return {
            "status": "pruned",
            "message": "Negative Learning triggered: Bad antibodies pruned."
        }
    
    else:
        # Correct prediction - just log
        return {
            "status": "correct",
            "message": "Prediction was correct, no training needed"
        }

# ─────────────────────────────────────────────────────────────────────
# /v1/keys/* — API Key Management
# ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    organization: str
    tier: str = "free"

@app.post("/v1/keys/register")
async def keys_register(req: RegisterRequest):
    """
    Public — no auth required.
    Generates a unique API key. Raw key returned ONCE, never stored.
    """
    req.email = req.email.strip().lower()
    req.organization = req.organization.strip()

    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not req.organization:
        raise HTTPException(status_code=400, detail="Organization name required")
    if req.tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Choose: {', '.join(TIER_CONFIG)}")

    # Prevent duplicate active keys per email
    db = load_api_keys()
    for record in db.values():
        if record.get("email") == req.email and record.get("status") == "active":
            raise HTTPException(
                status_code=409,
                detail=f"Active key already exists for {req.email}. Revoke it first via POST /v1/keys/revoke."
            )

    result = generate_api_key(email=req.email, organization=req.organization, tier=req.tier)
    return {
        "message": "Store this key safely — it will NOT be shown again.",
        "raw_key":   result["raw_key"],
        "client_id": result["record"]["client_id"],
        "record":    result["record"],
    }


@app.get("/v1/keys/me")
@limiter.limit("30/minute")
async def keys_me(request: Request, tenant_info: dict = Depends(get_api_key)):
    """Returns info about the current key (no sensitive data)."""
    return {k: v for k, v in tenant_info.items() if k != "email"}


@app.post("/v1/keys/revoke")
@limiter.limit("5/minute")
async def keys_revoke(request: Request, tenant_info: dict = Depends(get_api_key)):
    """Immediately revokes the calling API key."""
    raw_key  = request.headers.get("x-api-key", "")
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    db = load_api_keys()
    if key_hash not in db:
        raise HTTPException(status_code=404, detail="Key not found")
    db[key_hash]["status"]     = "revoked"
    db[key_hash]["revoked_at"] = datetime.now(timezone.utc).isoformat()
    save_api_keys(db)
    return {"message": "Key revoked.", "client_id": tenant_info["client_id"]}


@app.get("/v1/keys/list")
@limiter.limit("10/minute")
async def keys_list(request: Request, tenant_info: dict = Depends(get_api_key)):
    """
    Admin-only: list all keys.
    Requires enterprise tier OR AEGIS_ADMIN_CLIENT_ID env var matching the caller.
    """
    admin_id = os.environ.get("AEGIS_ADMIN_CLIENT_ID", "")
    if tenant_info.get("tier") != "enterprise" and tenant_info.get("client_id") != admin_id:
        raise HTTPException(status_code=403, detail="Admin (enterprise) access required")

    db = load_api_keys()
    keys_out = [
        {
            "hash_prefix":   h[:8] + "…",
            "client_id":     r.get("client_id"),
            "organization":  r.get("organization"),
            "tier":          r.get("tier"),
            "status":        r.get("status"),
            "created_at":    r.get("created_at"),
            "expires_at":    r.get("expires_at"),
            "last_used_at":  r.get("last_used_at"),
            "request_count": r.get("request_count", 0),
        }
        for h, r in db.items()
    ]
    keys_out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {"total": len(keys_out), "keys": keys_out}


# ═════════════════════════════════════════════════════════════════
#  /v1/auth/* — Account sign-up / login (JWT sessions)
# ═════════════════════════════════════════════════════════════════

# ── JWT dependency ─────────────────────────────────────────────────
def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token   = auth_header.split(" ", 1)[1]
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


class SignupRequest(BaseModel):
    email: str
    password: str
    organization: str
    tier: str = "free"


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/v1/auth/signup")
async def auth_signup(req: SignupRequest):
    """Register a new account."""
    try:
        user = signup_user(req.email, req.password, req.organization, req.tier)
        return {"message": "Account created. Please log in.", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/v1/auth/login")
async def auth_login(req: LoginRequest):
    """Login → returns JWT token."""
    try:
        result = login_user(req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/v1/auth/me")
async def auth_me(current_user: dict = Depends(get_current_user)):
    """Returns the currently logged-in user's profile."""
    return current_user


class UpgradePlanRequest(BaseModel):
    new_tier: str

@app.post("/v1/user/upgrade-plan")
@limiter.limit("5/minute")
async def upgrade_plan(request: Request, req: UpgradePlanRequest, current_user: dict = Depends(get_current_user)):
    """
    Upgrade or downgrade user plan.
    Updates: user record tier, all active keys' rate_limit + tier + expiry.
    """
    from users import load_users, save_users
    from datetime import timedelta

    if req.new_tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid tier. Choose: {', '.join(TIER_CONFIG)}")

    if req.new_tier == current_user.get("tier"):
        raise HTTPException(status_code=400, detail="You are already on this plan.")

    uid = current_user["user_id"]

    # Update user tier
    users_db = load_users()
    if uid not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    users_db[uid]["tier"] = req.new_tier
    save_users(users_db)

    # Do not update existing keys; they retain the properties of the plan they were generated under.
    # Only the user's base account tier is updated here.

    return {
        "message":      f"Plan upgraded to {req.new_tier}.",
        "new_tier":     req.new_tier,
        "keys_updated": 0, # Legacy field, kept for frontend compatibility
    }

class AdminGrantRequest(BaseModel):
    target_email: str
    new_tier: str

@app.post("/v1/admin/grant-plan")
async def admin_grant_plan(
    req: AdminGrantRequest,
    current_user: dict = Depends(get_current_user)
):
    """Admin-only endpoint to instantly grant a plan to any user by email."""
    if current_user.get("tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required.")
        
    if req.new_tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid tier.")
        
    from users import load_users, save_users
    users_db = load_users()
    
    # Find user by email
    target_email = req.target_email.lower().strip()
    target_uid = None
    for uid, u in users_db.items():
        if u.get("email") == target_email:
            target_uid = uid
            break
            
    if not target_uid:
        raise HTTPException(status_code=404, detail="User not found.")
        
    users_db[target_uid]["tier"] = req.new_tier
    save_users(users_db)
    
    return {
        "message": f"Successfully upgraded {target_email} to {req.new_tier}.",
        "target_email": target_email,
        "new_tier": req.new_tier
    }


# ═════════════════════════════════════════════════════════════════
#  /v1/user/keys/* — User key management (JWT-protected)
# ═════════════════════════════════════════════════════════════════

@app.get("/v1/user/keys")
async def user_list_keys(current_user: dict = Depends(get_current_user)):
    """List all API keys belonging to this user (masked — no raw key)."""
    db      = load_api_keys()
    uid     = current_user["user_id"]
    tier    = current_user.get("tier", "free")
    limit   = TIER_CONFIG.get(tier, TIER_CONFIG["free"])["keys"]

    user_keys = []
    for h, rec in db.items():
        if rec.get("user_id") == uid:
            user_keys.append({
                "key_id":        h[:16],           # short safe ID
                "hash_prefix":   h[:8] + "…",
                "client_id":     rec.get("client_id"),
                "tier":          rec.get("tier"),
                "status":        rec.get("status"),
                "rate_limit":    rec.get("rate_limit"),
                "created_at":    rec.get("created_at"),
                "expires_at":    rec.get("expires_at"),
                "last_used_at":  rec.get("last_used_at"),
                "request_count": rec.get("request_count", 0),
                "has_raw":       "raw_key_encrypted" in rec,
            })

    user_keys.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    active_count = sum(1 for k in user_keys if k["status"] == "active")

    return {
        "keys":         user_keys,
        "active_count": active_count,
        "key_limit":    limit,
        "at_limit":     active_count >= limit,
    }


class GenerateKeyRequest(BaseModel):
    label: str = ""   # optional friendly name


@app.post("/v1/user/keys/generate")
@limiter.limit("5/minute")
async def user_generate_key(
    request: Request,
    req: GenerateKeyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a new API key for the logged-in user (tier limit enforced)."""
    uid   = current_user["user_id"]
    tier  = current_user.get("tier", "free")
    limit = TIER_CONFIG.get(tier, TIER_CONFIG["free"])["keys"]
    org   = current_user.get("organization", "Unknown")

    db = load_api_keys()
    active = [r for r in db.values() if r.get("user_id") == uid and r.get("status") == "active"]

    if len(active) >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Key limit reached ({limit} active keys for {tier} plan). Revoke an existing key or upgrade."
        )

    result  = generate_api_key(email=current_user["email"], organization=org, tier=tier)
    key_hash = result["hash"]

    # Store encrypted raw key so user can retrieve it later
    db = load_api_keys()
    db[key_hash]["user_id"]           = uid
    db[key_hash]["label"]             = req.label or f"Key {len(active) + 1}"
    db[key_hash]["raw_key_encrypted"] = encrypt_key(result["raw_key"])
    save_api_keys(db)

    return {
        "message":   "Key generated. You can copy it anytime from your dashboard.",
        "key_id":    key_hash[:16],
        "client_id": result["record"]["client_id"],
        "raw_key":   result["raw_key"],       # shown in modal
        "record":    result["record"],
    }


@app.get("/v1/user/keys/reveal/{key_id}")
async def user_reveal_key(key_id: str, current_user: dict = Depends(get_current_user)):
    """Decrypt and return the raw API key — only owner can access it."""
    db  = load_api_keys()
    uid = current_user["user_id"]

    # Find key by prefix match
    matched_hash = next((h for h in db if h.startswith(key_id)), None)
    if not matched_hash or db[matched_hash].get("user_id") != uid:
        raise HTTPException(status_code=404, detail="Key not found or access denied")

    enc = db[matched_hash].get("raw_key_encrypted")
    if not enc:
        raise HTTPException(status_code=404, detail="Raw key not stored (legacy key)")

    raw = decrypt_key(enc)
    return {"raw_key": raw, "client_id": db[matched_hash].get("client_id")}


@app.post("/v1/user/keys/revoke/{key_id}")
async def user_revoke_key(key_id: str, current_user: dict = Depends(get_current_user)):
    """Revoke a specific key by key_id prefix — only owner can revoke."""
    db  = load_api_keys()
    uid = current_user["user_id"]

    matched_hash = next((h for h in db if h.startswith(key_id)), None)
    if not matched_hash or db[matched_hash].get("user_id") != uid:
        raise HTTPException(status_code=404, detail="Key not found or access denied")

    db[matched_hash]["status"]     = "revoked"
    db[matched_hash]["revoked_at"] = datetime.now(timezone.utc).isoformat()
    save_api_keys(db)
    return {"message": "Key revoked.", "key_id": key_id}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[API] Starting Server on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
