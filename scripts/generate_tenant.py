import os
import sys
import argparse
import hashlib
import json
import secrets
from datetime import datetime, timezone

# Path to API keys database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEYS_FILE = os.path.join(BASE_DIR, 'memory', 'api_keys.json')

def load_db():
    if os.path.exists(API_KEYS_FILE):
        with open(API_KEYS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_db(data):
    os.makedirs(os.path.dirname(API_KEYS_FILE), exist_ok=True)
    with open(API_KEYS_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def generate_key(prefix="sk_live_"):
    # Generate 32 bytes of randomness and convert to hex
    return f"{prefix}{secrets.token_hex(32)}"

def hash_key(api_key):
    return hashlib.sha256(api_key.encode()).hexdigest()

def create_tenant(client_id, org_name, tier="free", custom_key=None):
    db = load_db()
    
    # Generate API key
    if custom_key:
        api_key = custom_key
    else:
        prefix = "sk_dev_" if tier == "free" else "sk_live_"
        api_key = generate_key(prefix)
        
    hashed_key = hash_key(api_key)
    
    if hashed_key in db:
        print(f"Error: A key with this hash already exists.")
        return
        
    # Rate limits mapped to tiers (SlowAPI format: "requests/time")
    rate_limits = {
        "free": "10/minute",
        "pro": "100/minute",
        "enterprise": "1000/minute"
    }

    db[hashed_key] = {
        "client_id": client_id,
        "organization_name": org_name,
        "status": "active",
        "tier": tier,
        "rate_limit_config": rate_limits.get(tier, "10/minute"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    save_db(db)
    
    print("\n" + "="*50)
    print("SUCCESS: Tenant API Key Generated")
    print("="*50)
    print(f"Organization  : {org_name}")
    print(f"Client ID     : {client_id}")
    print(f"Tier          : {tier}")
    print(f"Rate Limit    : {db[hashed_key]['rate_limit_config']}")
    print("-" * 50)
    print(f"API KEY       : {api_key}")
    print("-" * 50)
    print("IMPORTANT: Provide this key to the client. It will NOT be stored in plaintext.")
    print("="*50 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aegis V - Tenant Management Tool")
    parser.add_argument("--org", required=True, help="Organization Name")
    parser.add_argument("--client-id", required=True, help="Unique Client ID (e.g., org_acme_prod)")
    parser.add_argument("--tier", choices=["free", "pro", "enterprise"], default="free", help="Billing Tier")
    parser.add_argument("--custom-key", help="Use a specific dev key instead of generating one (e.g., 'sk_dev_12345')")
    
    args = parser.parse_args()
    create_tenant(args.client_id, args.org, args.tier, args.custom_key)
