import os
import sys
import hashlib
import getpass
import shutil
import time
import json

# Add src to path to import config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))
import config

# Paths
MEMORY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'memory'))
ANTIBODIES_FILE = os.path.join(MEMORY_DIR, 'antibodies.json')
CHAIN_FILE = os.path.join(MEMORY_DIR, 'audit_chain.json')
TRAINING_LOG_FILE = os.path.join(MEMORY_DIR, 'training_data_log.json')

def verify_password():
    print("\n=== Aegis V Admin Reset ===")
    print("This action will WIPE all learned antibodies, training logs, and the blockchain ledger.")
    print("System must be RESTARTED after this operation.")
    
    pwd = getpass.getpass("Enter Admin Password: ")
    
    # Simple SHA-256 hash check
    hashed_pwd = hashlib.sha256(pwd.encode()).hexdigest()
    
    if hashed_pwd == config.ADMIN_PASSWORD_HASH:
        return True
    else:
        print("\n[ACCESS DENIED] Invalid Password.")
        return False

def reset_system():
    if not os.path.exists(MEMORY_DIR):
        print(f"Memory directory not found at {MEMORY_DIR}")
        return

    print("\n[1/3] Creating Backup...")
    timestamp = int(time.time())
    backup_dir = os.path.join(MEMORY_DIR, 'backups', f'backup_{timestamp}')
    os.makedirs(backup_dir, exist_ok=True)
    
    if os.path.exists(ANTIBODIES_FILE):
        shutil.copy(ANTIBODIES_FILE, backup_dir)
        print(f"    Backed up antibodies to {backup_dir}")
    
    if os.path.exists(TRAINING_LOG_FILE):
        shutil.copy(TRAINING_LOG_FILE, backup_dir)
        print(f"    Backed up training log to {backup_dir}")
        
    if os.path.exists(CHAIN_FILE):
        shutil.copy(CHAIN_FILE, backup_dir)
        print(f"    Backed up ledger to {backup_dir}")

    print("\n[2/3] Wiping Data...")
    if os.path.exists(ANTIBODIES_FILE):
        os.remove(ANTIBODIES_FILE)
        print("    Deleted antibodies.json")
    
    if os.path.exists(TRAINING_LOG_FILE):
        os.remove(TRAINING_LOG_FILE)
        print("    Deleted training_data_log.json")
    
    if os.path.exists(CHAIN_FILE):
        os.remove(CHAIN_FILE)
        print("    Deleted audit_chain.json")

    print("\n[3/3] Re-initializing System State...")
    print("    Starting partial system init to seed files...")
    
    # We briefly initialize the classes to trigger their auto-seed logic
    # Suppress output for cleaner admin view
    try:
        from core.blockchain import Blockchain
        print("    -> Seeding Genesis Block...", end=" ")
        bc = Blockchain() # This triggers create_genesis_block if file missing
        print("Done.")
        
        from layer1.membrane import CognitiveMembrane
        print("    -> Seeding Initial Antibodies...", end=" ")
        # Depending on implementation, Membrane might need more args or environment setup
        # But looking at __init__, it primarily loads/seeds.
        # Note: Membrane init starts LLM engine which might be heavy. 
        # We can just let the system clean start next time, but user asked to reset data.
        # Deleting files is enough for "Reset". The classes will handle it on next run.
        # But having files present is safer.
        
        # Actually, let's just let the next run handle it to avoid weight loading delays here.
        # Touching the files or leaving them deleted is fine.
        # Blockchain is fast to init. L1 is heavy.
        print("Skipped (Will auto-seed on next system startup).")
        
    except Exception as e:
        print(f"\n[WARNING] Auto-seed failed: {e}")
        print("System will attempt to repair on next normal startup.")

    print("\n[SUCCESS] System Memory Reset Complete.")
    print(f"Backup stored in: {backup_dir}")
    print("PLEASE RESTART THE AEGIS SERVER NOW.")

if __name__ == "__main__":
    if verify_password():
        reset_system()
