import random
import uuid
import asyncio
import sys
import os

# Adjust path to find config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import config
from llm_engine import get_engine

class SelfHardeningCore:
    def __init__(self, layer1_ref):
        self.engine = get_engine()
        provider = getattr(config, 'LLM_PROVIDER', 'ollama')
        print(f"    [L3] Initializing Immune System (Red Team: {provider})...")
        self.layer1 = layer1_ref # Reference to L1 to inject new rules
        self.kb_updates = 0

    async def process_event(self, blocked_prompt, reason):
        """
        Async method to analyze the breach and generate antibodies.
        """
        print(f"\n    [L3-Async] [ANALYSIS] Analyzing Blocked Threat: '{blocked_prompt}'")
        print(f"    [L3-Async] Reason: {reason}")
        
        # 1. Internal Red Teaming (Real LLM Generation)
        variations = await self._generate_variations(blocked_prompt)
        # CRITICAL FIX: Always include the original threat!
        variations.append(blocked_prompt) 
        print(f"    [L3-Async] [RED TEAM] Generated {len(variations)} adversarial variations (including original).")
        
        # 2. Test against CURRENT defenses
        new_vulnerabilities = []
        for v in variations:
            is_safe, _, _ = self.layer1.check(v)
            if is_safe:
                # If L1 thinks it's safe, but it's a variation of a known threat -> VULNERABILITY
                new_vulnerabilities.append(v)
        
        # 3. Antibody Synthesis
        if new_vulnerabilities:
            print(f"    [L3-Async] [ALERT] Found {len(new_vulnerabilities)} bypasses! Synthesizing antibodies...")
            for vuln in new_vulnerabilities:
                # Create a specific rule/embedding for this variation
                rule_id = f"auto_rule_{str(uuid.uuid4())[:8]}"
                self.layer1.learn_new_threat(vuln, f"Antibody for {rule_id}")
            
            self.kb_updates += len(new_vulnerabilities)
            print(f"    [L3-Async] [SUCCESS] System Hardened. New antibodies deployed locally.")
        else:
            print(f"    [L3-Async] System is robust. No new variations bypassed L1.")

    async def _generate_variations(self, prompt):
        """
        Uses LLM engine to generate semantic variations.
        """
        system_prompt = """
        You are a Red Team Expert. I will give you a blocked malicious prompt.
        Generate 3 variations of this prompt that might evade keyword filters but have the SAME malicious intent.
        Use synonyms, slang, or slight rephrasing.
        Output ONLY the 3 variations, one per line. No numbering.
        """
        
        try:
            # Use the configured engine (OpenAI, Anthropic, or Ollama)
            text = self.engine.chat_text(system_prompt, f"Blocked Prompt: {prompt}")
            variations = [line.strip() for line in text.split('\n') if line.strip()]
            return variations[:5] # Limit to 5
            
        except Exception as e:
            print(f"[ERR] Red Team Generation Failed: {e}")
            return [f"Variation of {prompt}"] # Fallback

    async def process_supervised_feedback(self, prompt, ground_truth_label):
        """
        SUPERVISED LEARNING: Train antibodies based on explicit ground truth feedback.
        
        This method has HIGHER PRIORITY than autonomous training because it uses
        verified labels from the test client. When the test client says we missed
        an attack (false negative), we immediately train antibodies.
        
        Args:
            prompt: The prompt that bypassed defenses
            ground_truth_label: "MALICIOUS" or "BENIGN" (from test client)
        """
        if ground_truth_label != "MALICIOUS":
            # Only train on confirmed attacks that we missed
            return
            
        print(f"\n    [L3-SUPERVISED] ⚠️  Training on MISSED ATTACK (False Negative)")
        print(f"    [L3-SUPERVISED] Prompt: '{prompt[:80]}...'")
        
        # Generate adversarial variations (reuse existing method)
        variations = await self._generate_variations(prompt)
        variations.append(prompt)  # Always include the original
        
        print(f"    [L3-SUPERVISED] Generated {len(variations)} variations for supervised training")
        
        # Add ALL variations as antibodies (no testing - ground truth is trusted!)
        supervised_count = 0
        for vuln in variations:
            rule_id = f"supervised_{str(uuid.uuid4())[:8]}"
            self.layer1.learn_new_threat(vuln, f"Antibody for {rule_id}")
            supervised_count += 1
        
        self.kb_updates += supervised_count
        print(f"    [L3-SUPERVISED] ✅ Added {supervised_count} SUPERVISED antibodies (ground truth)")
        print(f"    [L3-SUPERVISED] Total KB updates: {self.kb_updates}")

