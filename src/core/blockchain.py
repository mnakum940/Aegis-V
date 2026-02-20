import hashlib
import json
import time
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config

class Block:
    def __init__(self, index, timestamp, data, previous_hash):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()

    def calculate_hash(self):
        # We ensure keys are sorted for consistent hashing
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash
        }, sort_keys=True)
        
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self):
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "hash": self.hash
        }

class Blockchain:
    def __init__(self, client_id="default"):
        self.client_id = client_id
        self.chain_file = os.path.join(config.get_tenant_dir(self.client_id), 'audit_chain.json')
        self.chain = []
        if not self.load_chain():
            self.create_genesis_block()

    def create_genesis_block(self):
        genesis_block = Block(0, time.time(), {"event": "Genesis Block - System Init"}, "0")
        self.chain.append(genesis_block)
        self.save_chain()

    def get_latest_block(self):
        return self.chain[-1]

    def add_block(self, data):
        latest_block = self.get_latest_block()
        new_block = Block(
            index=latest_block.index + 1,
            timestamp=time.time(),
            data=data,
            previous_hash=latest_block.hash
        )
        self.chain.append(new_block)
        self.save_chain()
        return new_block

    def is_chain_valid(self):
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]

            # 1. Check if the block's stored hash is valid
            if current_block.hash != current_block.calculate_hash():
                return False, f"Block {i} Hash Mismatch! Data may be tampered."

            # 2. Check if previous_hash matches the previous block's hash
            if current_block.previous_hash != previous_block.hash:
                return False, f"Block {i} Link Broken! Previous Hash doesn't match."

        return True, "Chain is Valid."

    def save_chain(self):
        os.makedirs(os.path.dirname(self.chain_file), exist_ok=True)
        chain_data = [b.to_dict() for b in self.chain]
        with open(self.chain_file, 'w') as f:
            json.dump(chain_data, f, indent=4)

    def load_chain(self):
        if not os.path.exists(self.chain_file):
            return False
        
        try:
            with open(self.chain_file, 'r') as f:
                chain_data = json.load(f)
                
            self.chain = []
            for b_data in chain_data:
                block = Block(
                    b_data['index'],
                    b_data['timestamp'],
                    b_data['data'],
                    b_data['previous_hash']
                )
                # Verify integrity on load (optional, but good for security)
                # If we modify logic later, old hashes might not match if calculation changes.
                # ideally we just trust the stored hash for loading functionality
                block.hash = b_data['hash'] 
                self.chain.append(block)
            return True
        except Exception as e:
            print(f"[ERR] Failed to load blockchain: {e}")
            return False
