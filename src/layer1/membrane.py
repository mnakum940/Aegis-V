import numpy as np
import sys
import os
import ollama

import json

# Adjust path to find config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config

class CognitiveMembrane:
    def __init__(self, client_id="default"):
        self.client_id = client_id
        self.memory_file = os.path.join(config.get_tenant_dir(self.client_id), 'antibodies.json')
        
        # Initialize Engine
        from llm_engine import get_engine
        self.engine = get_engine()
        
        print(f"    [L1] Initializing Cognitive Membrane (Provider: {config.LLM_PROVIDER})...")
        self.vectors = []
        self.labels = []
        self.patterns = []  # NEW: Store keyword patterns
        
        # Try to load long-term memory
        self.last_load_time = 0
        if self._load_memory():
            print(f"    [L1] Loaded {len(self.vectors)} antibodies from Long-Term Memory.")
        else:
            # ... (seeding logic remains same)
            pass

    def _load_memory(self):
        """Loads vectors from JSON file."""
        if not os.path.exists(self.memory_file):
            return False
        
        try:
            # Check modification time
            mtime = os.path.getmtime(self.memory_file)
            self.last_load_time = mtime
            
            with open(self.memory_file, 'r') as f:
                data = json.load(f)
                
            if not data:
                return False
                
            self.vectors = [np.array(v) for v in data['vectors']]
            self.labels = data['labels']
            # Load patterns with backward compatibility
            self.patterns = data.get('patterns', [''] * len(self.labels))
            return True
        except Exception as e:
            print(f"[ERR] Failed to load memory: {e}")
            return False

    def _check_reload(self):
        """Hot-Reload: Checks if memory file changed on disk."""
        if os.path.exists(self.memory_file):
            mtime = os.path.getmtime(self.memory_file)
            if mtime > self.last_load_time:
                print(f"    [L1] Detected memory update on disk for tenant {self.client_id}. Reloading...")
                self._load_memory()
                print(f"    [L1] Hot-Reload complete. Antibodies: {len(self.vectors)}")

    # ... (save_memory remains same)



    def _save_memory(self):
        """Saves current state to JSON."""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
            
            serializable_vectors = []
            for v in self.vectors:
                if isinstance(v, np.ndarray):
                    serializable_vectors.append(v.tolist())
                else:
                    serializable_vectors.append(v)

            data = {
                'vectors': serializable_vectors, 
                'labels': self.labels,
                'patterns': self.patterns  # NEW: Save patterns
            }
            
            with open(self.memory_file, 'w') as f:
                json.dump(data, f)
                
        except Exception as e:
            print(f"[ERR] Failed to save memory: {e}")

    def _get_embedding(self, text):
        return self.engine.get_embedding(text) 

    def _cosine_similarity(self, v1, v2):
        v1 = np.array(v1)
        v2 = np.array(v2)
        # Robustness: Check for dimension mismatch (e.g. 768 vs 384)
        if v1.shape != v2.shape:
            return 0.0

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return np.dot(v1, v2) / (norm1 * norm2)

    def check(self, prompt):
        """
        Returns (is_safe: bool, reason: str, similarity: float)
        """
        # Hot-Reload Check before every scan
        self._check_reload()

        if not self.vectors:
            return True, "Safe (No Rules)", 0.0

        target_vector = self._get_embedding(prompt)
        
        # Simple linear scan for demo (Scale up -> use FAISS/ChromaDB)
        max_sim = -1.0
        best_match_label = ""
        
        for i, vec in enumerate(self.vectors):
            sim = self._cosine_similarity(target_vector, vec)
            if sim > max_sim:
                max_sim = sim
                best_match_label = self.labels[i]

        # Threshold: > 0.85 usually means very semantically similar
        # Adjusted to 0.75 to reduce false positives (Auto-Immune reactions)
        threshold = 0.75 # config.SIMILARITY_THRESHOLD 
        
        if max_sim > threshold:
            if best_match_label.startswith("SAFE:"):
                return True, f"Semantic match to Safe Anchor: {best_match_label}", max_sim
            else:
                return False, f"Semantic match to: {best_match_label}", max_sim
            
        return True, "Safe", max_sim

    def prune_antibodies(self, safe_prompts):
        """
        Negative Learning: Removes antibodies that incorrectly flag safe prompts.
        """
        print(f"    [L1] Running Negative Learning on {len(safe_prompts)} safe prompts...")
        initial_count = len(self.vectors)
        to_remove_indices = set()
        
        # Check each antibody against the safe set
        for safe_p in safe_prompts:
            safe_vec = self._get_embedding(safe_p)
            
            for i, anti_vec in enumerate(self.vectors):
                # Skip if already marked or if it's a SAFE anchor itself
                if i in to_remove_indices or self.labels[i].startswith("SAFE:"):
                    continue
                
                # Check collision
                sim = self._cosine_similarity(safe_vec, anti_vec)
                # Sensitive threshold: if it blocks a safe prompt (sim > 0.75), it's a bad antibody
                if sim > 0.75: # Matching config.SIMILARITY_THRESHOLD
                    print(f"    [L1-Prune] Antibody '{self.labels[i]}' conflicts with safe prompt '{safe_p}' (Sim: {sim:.2f}). Marking for deletion.")
                    to_remove_indices.add(i)
        
        # Remove bad antibodies (in reverse order to keep indices valid, or rebuild list)
        if to_remove_indices:
            new_vectors = []
            new_labels = []
            for i in range(len(self.vectors)):
                if i not in to_remove_indices:
                    new_vectors.append(self.vectors[i])
                    new_labels.append(self.labels[i])
            
            self.vectors = new_vectors
            self.labels = new_labels
            self._save_memory()
            print(f"    [L1] Pruned {len(to_remove_indices)} antibodies. Count: {initial_count} -> {len(self.vectors)}")
        else:
            print("    [L1] No conflicts found. Memory is healthy.")

    def _extract_keywords(self, text, top_n=5):
        """Extract top keywords from threat text."""
        # Simple keyword extraction: tokenize, filter, return top words
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                     'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
                     'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these',
                     'what', 'which', 'who', 'when', 'where', 'how', 'why', 'user', 'query'}
        
        # Tokenize and clean
        words = text.lower().split()
        keywords = []
        for word in words:
            # Remove punctuation
            clean_word = ''.join(c for c in word if c.isalnum())
            if clean_word and len(clean_word) > 2 and clean_word not in stopwords:
                keywords.append(clean_word)
        
        # Get unique keywords (preserve order)
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)
        
        return unique_keywords[:top_n]  # Return top N
    
    def learn_new_threat(self, threat_text, label):
        """
        Adds a new antibody to the index.
        """
        vector = self._get_embedding(threat_text)
        keywords = self._extract_keywords(threat_text)
        
        self.vectors.append(vector)
        self.labels.append(label)
        self.patterns.append(', '.join(keywords))  # Store as comma-separated string
        
        self._save_memory() # Persist immediately
        # print(f"    [L1] Learned new antibody: '{threat_text[:20]}...'")
