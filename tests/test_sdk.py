import sys
import os

# Add local sdk to path for testing without pip install
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'sdk')))

from aegis_v.client import AegisClient, AegisAPIError

def main():
    # Initialize the client with our generated hash key
    print("initializing Aegis Client...")
    client = AegisClient(
        api_key="sk_dev_12345", 
        base_url="http://localhost:8000"
    )

    print("\n--- Test 1: Standard Protection Request ---")
    try:
        res = client.protect("Hello! I am just a friendly prompt.")
        print("Success! Got response:")
        print(f"Allowed: {res['allowed']}")
        print(f"Risk Score: {res['risk_score']}")
        print(f"Latency: {res['latency_ms']:.2f}ms")
    except AegisAPIError as e:
        print(f"Error: {e}")

    print("\n--- Test 2: Rate Limiting Test (Rapid Fire) ---")
    # Our free tier limit is 10/minute. Let's send 12 requests instantly.
    success_count = 0
    fail_count = 0
    
    for i in range(12):
        try:
            client.protect(f"Test message {i}")
            success_count += 1
            print(f"Request {i+1} succeeded.")
        except AegisAPIError as e:
            if "429" in str(e):
                fail_count += 1
                print(f"Request {i+1} RATE LIMITED (429)! Working as expected.")
            else:
                print(f"Unexpected error: {e}")

    print(f"\nStats: {success_count} succeeded, {fail_count} rate limited.")
    
    # 429 should have tripped twice since the limit is 10.
    if fail_count > 0:
        print("[OK] Rate Limiting is active and working.")
    else:
        print("[FAIL] Rate Limiting did not trigger.")

if __name__ == "__main__":
    main()
