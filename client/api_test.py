import requests
import json
import sys
import time
import random
from datetime import datetime
from attack_generator import generate_random_attack, generate_random_benign

# Configuration
API_URL = "http://localhost:8000/v1/chat"
DATA_LOG_FILE = "memory/clients/org_default/training_data_log.json"  # Still used locally for test tool
API_KEY = "sk_dev_12345"
HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

class RedTeamClient:
    def __init__(self):
        # No more hardcoded vectors - using advanced generator!
        self.training_log = []
        self.load_existing_log()
        print("[INFO] Using Advanced Attack Generator with 10+ categories")
        print("   - Jailbreak, Injection, Roleplay, Social Engineering")
        print("   - Obfuscation, Urgency, Boiling Frog, System Prompts")
        print("   - False Positives, Multi-stage Attacks")
        print("   - Hundreds of unique templates = No more repetition!\n")

    def load_existing_log(self):
        """Load existing training data if available."""
        try:
            with open(DATA_LOG_FILE, 'r') as f:
                self.training_log = json.load(f)
            print(f"[INFO] Loaded {len(self.training_log)} existing training records")
        except FileNotFoundError:
            print(f"[INFO] Starting new training log")
            self.training_log = []

    def save_log(self):
        """Save training data to file (with message)."""
        with open(DATA_LOG_FILE, 'w') as f:
            json.dump(self.training_log, f, indent=2)
        print(f"\n[SAVED] Training data saved to {DATA_LOG_FILE} ({len(self.training_log)} records)")
    
    def _save_log_silent(self):
        """Save training data to file silently (for auto-save after each prompt)."""
        with open(DATA_LOG_FILE, 'w') as f:
            json.dump(self.training_log, f, indent=2)

    def generate_attack_prompt(self):
        """Generate diverse attack using advanced generator."""
        print(f"\n[GENERATOR] Crafting ATTACK...")
        try:
            return generate_random_attack()
        except Exception as e:
            print(f"[ERROR] Generator failed: {e}")
            return None

    def generate_benign_prompt(self):
        """Generate diverse benign prompt using advanced generator."""
        print(f"\n[GENERATOR] Crafting BENIGN prompt...")
        try:
            return generate_random_benign()
        except Exception as e:
            print(f"[ERROR] Generator failed: {e}")
            return None

    def send_to_aegis(self, prompt, expected_label, attack_type="unknown"):
        """Sends prompt to Aegis V API and logs the result."""
        print(f"[SENDING] [{attack_type}] '{prompt[:60]}...'")
        try:
            start_time = time.time()
            res = requests.post(API_URL, json={"message": prompt}, headers=HEADERS)
            latency = (time.time() - start_time) * 1000
            
            if res.status_code == 200:
                data = res.json()
                status = "ALLOWED" if data['allowed'] else "BLOCKED"
                risk = data.get('risk_score', 0)
                
                # Use Server-Side Latency (more accurate for internal performance)
                server_latency = data.get('latency_ms', latency) # Fallback to RTT if missing
                
                # Log this training sample
                log_entry = {
                    "timestamp": datetime.now().isoformat(),
                    "prompt": prompt,
                    "attack_type": attack_type,
                    "expected_label": expected_label,  # "MALICIOUS" or "BENIGN"
                    "actual_decision": status,
                    "risk_score": risk,
                    "latency_ms": round(server_latency, 2),
                    "correct": (expected_label == "MALICIOUS" and status == "BLOCKED") or 
                               (expected_label == "BENIGN" and status == "ALLOWED")
                }
                self.training_log.append(log_entry)
                
                # AUTO-SAVE: Save after each prompt to prevent data loss
                self._save_log_silent()
                
                # Display result
                correctness = "CORRECT" if log_entry['correct'] else "INCORRECT"
                print(f"[RESULT] {status} | Risk: {risk} | {correctness} | {latency:.2f}ms")
                
                if not data['allowed']:
                    print(f"   -> Defense: {data.get('response', '')[:80]}...")
                
                # SUPERVISED LEARNING: Send feedback if incorrect
                if not log_entry['correct']:
                    self._send_feedback(log_entry)
                
                return status, risk, log_entry['correct']
            else:
                print(f"[ERROR] API Status {res.status_code}")
                return "ERROR", 0, False
        except Exception as e:
            print(f"[ERROR] API Connection failed: {e}")
            return "ERROR", 0, False

    def _send_feedback(self, log_entry):
        """Send supervised learning feedback to the API."""
        # Only send feedback for false negatives (missed attacks)
        if log_entry['expected_label'] == "MALICIOUS" and log_entry['actual_decision'] == "ALLOWED":
            print(f"   [FEEDBACK] ⚠️  Sending missed attack for supervised training...")
            try:
                feedback_url = API_URL.replace("/v1/chat", "/v1/feedback")
                feedback_res = requests.post(feedback_url, json={
                    "prompt": log_entry['prompt'],
                    "expected_label": log_entry['expected_label'],
                    "actual_decision": log_entry['actual_decision'],
                    "correct": log_entry['correct']
                }, headers=HEADERS)
                if feedback_res.status_code == 200:
                    result = feedback_res.json()
                    print(f"   [FEEDBACK] ✅ {result.get('message', 'Training complete')}")
                else:
                    print(f"   [FEEDBACK] ❌ Feedback failed: {feedback_res.status_code}")
            except Exception as e:
                print(f"   [FEEDBACK] ❌ Error sending feedback: {e}")

    def start_balanced_training(self, iterations=10):
        """Runs balanced training with both malicious and benign prompts."""
        print("="*60)
        print(f"AEGIS V BALANCED TRAINING CLIENT")
        print(f"Target: {API_URL}")
        print(f"Generator: Advanced Attack Generator (10+ categories)")
        print(f"Mode: BALANCED (50% Attack, 50% Benign)")
        print("="*60)

        stats = {"blocked": 0, "allowed": 0, "correct": 0, "total": 0}
        
        for i in range(iterations):
            print(f"\n>>> ROUND {i+1}/{iterations}")
            
            # Alternate between attack and benign
            is_attack = (i % 2 == 0)
            
            if is_attack:
                prompt, category = self.generate_attack_prompt()
                expected = "MALICIOUS"
            else:
                prompt, category = self.generate_benign_prompt()
                expected = "BENIGN"
            
            if not prompt:
                continue
            
            # Send and log
            status, risk, correct = self.send_to_aegis(prompt, expected, category)
            
            # Update stats
            stats['total'] += 1
            if status == "BLOCKED":
                stats['blocked'] += 1
            elif status == "ALLOWED":
                stats['allowed'] += 1
            if correct:
                stats['correct'] += 1
            
            time.sleep(1)
        
        # Save data
        self.save_log()
        
        # Print summary
        print("\n" + "="*60)
        print("TRAINING SESSION COMPLETE")
        print("="*60)
        print(f"Total Prompts: {stats['total']}")
        print(f"Blocked: {stats['blocked']}")
        print(f"Allowed: {stats['allowed']}")
        print(f"Accuracy: {stats['correct']}/{stats['total']} ({100*stats['correct']/stats['total']:.1f}%)")
        print(f"\nData saved to: {DATA_LOG_FILE}")
        print("You can now visualize this data with pca_analysis.py")

def manual_test(prompt):
    """Legacy manual test function."""
    client = RedTeamClient()
    client.send_to_aegis(prompt, "UNKNOWN", "manual")
    client.save_log()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Manual mode
        manual_test(" ".join(sys.argv[1:]))
    else:
        # Auto-training mode
        client = RedTeamClient()
        try:
            print("\n[MENU]")
            print("1. Balanced Training (Good + Bad prompts)")
            print("2. Attack-Only Training (Legacy)")
            choice = input("Select mode (1/2): ").strip()
            
            if choice == "1":
                count = int(input("How many rounds? (default 10, must be even): ") or 10)
                client.start_balanced_training(count)
            elif choice == "2":
                # Legacy attack-only mode
                count = int(input("How many attack rounds? (default 5): ") or 5)
                print("\n[WARNING] Using legacy attack-only mode. Consider using Balanced Training.")
                # Could call old method here if needed
            else:
                print("Invalid choice.")
        except KeyboardInterrupt:
            print("\n\nExiting...")
            client.save_log()
