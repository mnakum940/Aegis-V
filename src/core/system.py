import asyncio
import sys
import os
import time
import ollama

# Adjust path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from layer1.membrane import CognitiveMembrane
from layer2.intent import IntentTracker
from layer3.hardening import SelfHardeningCore
from core.blockchain import Blockchain
from llm_engine import get_engine
import config

class AegisSystem:
    def __init__(self, client_id="default"):
        self.client_id = client_id
        print(f"\n[INIT] Booting Aegis V Defense System for tenant {client_id}...")
        self.engine = get_engine()
        self.layer1 = CognitiveMembrane(client_id=client_id)
        self.layer2 = IntentTracker()
        self.layer3 = SelfHardeningCore(self.layer1) # L3 needs access to L1 to patch it
        self.blockchain = Blockchain(client_id=client_id)
        self.chat_history = []  # Maintain conversation context
        print(f"    [AUDIT] Blockchain Ledger Online. Height: {len(self.blockchain.chain)}")
        print(f"[INIT] System Online for tenant {client_id}. Waiting for traffic...\n")

    async def process_prompt(self, user_prompt):
        start_time = time.time()
        print(f"\n--- New Request: '{user_prompt}' ---")
        
        result = {
            "prompt": user_prompt,
            "response": "",
            "l1_safe": False,
            "l1_dist": 0.0,
            "l2_safe": False,
            "l2_score": 0,
            "block_reason": "",
            "latency_ms": 0.0,
            "stage": "INIT"
        }

        if len(self.chat_history) > config.MAX_HISTORY_TURNS * 2:
            self.chat_history = self.chat_history[-config.MAX_HISTORY_TURNS*2:]
            # print(f"[MEM] Chat history truncated to last {config.MAX_HISTORY_TURNS} turns.")

        # === PERFORMANCE OPTIMIZATION: PARALLEL LAYER EXECUTION ===
        
        l2_result_future = None
        
        if config.PARALLEL_LAYERS:
            # print("[PERF] Starting parallel layer execution...")
            # Start Layer 2 analysis in parallel (async)
            l2_result_future = asyncio.create_task(
                asyncio.to_thread(self.layer2.analyze, user_prompt)
            )
        else:
             pass # print("[PERF] Serial execution (optimized for local resource).")
        
        # --- LAYER 1: MEMBRANE CHECK (Fast - 30ms) ---
        l1_safe, l1_reason, l1_dist = self.layer1.check(user_prompt)
        result["l1_safe"] = l1_safe
        result["l1_dist"] = l1_dist
        
        # EARLY EXIT: If Layer 1 blocks, return immediately
        if not l1_safe:
            print(f"[BLOCKED] Layer 1 (Membrane): {l1_reason} - Returning immediately")
            
            # Cancel Layer 2 if it's still running (save resources)
            if l2_result_future and not l2_result_future.done():
                l2_result_future.cancel()
                # print(f"[PERF] Layer 2 cancelled (no longer needed)")
            
            # === LAYER 3 VERIFICATION GATE (ASYNC) ===
            # Verify in background - don't block response
            # print(f"    [L3-Gate] Scheduling background verification (non-blocking)...")
            
            async def verify_and_maybe_create_antibody():
                """Background task: verify blocked prompt before creating antibodies"""
                try:
                    # Re-run Layer 2 in background for verification
                    l2_allowed, l2_score, l2_reason = True, 0, ""
                    
                    if config.PARALLEL_LAYERS or not config.LLM_PROVIDER: 
                        pass
                    
                    l2_allowed, l2_score, l2_reason = self.layer2.analyze(user_prompt)
                    
                    if l2_score > config.RISK_THRESHOLD_BLOCK:
                        # Both layers agree → safe to create antibodies
                        # print(f"    [L3-Gate-BG] ✓ Layer 2 confirms threat (risk={l2_score})")
                        print(f"    [L3-Gate-BG] Triggering antibody synthesis...")
                        await self.layer3.process_event(user_prompt, l1_reason)
                    else:
                        # Layer 2 disagrees → LAYER 1 FALSE POSITIVE
                        print(f"    [L3-Gate-BG] ✗ Layer 2 overrides (risk={l2_score}). No antibody created.")
                        # print(f"    [L3-Gate-BG] Potential bad antibody prevented: '{l1_reason}'")
                except Exception as e:
                    print(f"    [L3-Gate-BG] Verification failed: {e}")
            
            # Fire and forget - don't wait for verification
            asyncio.create_task(verify_and_maybe_create_antibody())
            
            # Return immediately to user (INSTANT RESPONSE!)
            result["response"] = f"[SYSTEM] Request Rejected. Security Violation.\n\n**Reason:** {l1_reason}"
            result["block_reason"] = l1_reason
            result["stage"] = "BLOCKED_L1"
            result["l2_safe"] = None  # Layer 2 not waited for
            result["l2_score"] = 100  # Explicit high risk for L1 blocks
            self._log_transaction(result)
            return result


        print(f"[PASS] Layer 1 (Dist: {l1_dist:.4f})")

        # --- LAYER 2: INTENT CHECK ---
        # Optimization: If L1 is VERY confident it's a Safe Anchor, skip L2
        l2_bypass = False
        if l1_safe and "Safe Anchor" in l1_reason and l1_dist > 0.70:
            print(f"[FAST] Layer 2 Skipped due to High Confidence Membrane Match ({l1_dist:.4f})")
            # Cancel the task
            if l2_result_future and not l2_result_future.done():
                l2_result_future.cancel()
            l2_allowed = True
            l2_score = 0
            l2_reason = "Skipped (Trusted Pattern)"
            l2_bypass = True
        else:
            # Get Layer 2 result
            try:
                if l2_result_future:
                    # print(f"[PERF] Waiting for Layer 2 (Parallel)...")
                    l2_allowed, l2_score, l2_reason = await l2_result_future
                else:
                    # print(f"[PERF] Running Layer 2 (Serial)...")
                    # Run synchronously (or async wrapper) in current thread context
                    l2_allowed, l2_score, l2_reason = self.layer2.analyze(user_prompt)
                    
            except asyncio.CancelledError:
                print(f"[ERROR] Layer 2 was cancelled unexpectedly")
                l2_allowed = True
                l2_score = 0
                l2_reason = "Cancelled"
                l2_bypass = True
        
        result["l2_safe"] = l2_allowed
        result["l2_score"] = l2_score
        result["l2_skipped"] = l2_bypass
        
        if not l2_allowed:
            print(f"[BLOCKED] Layer 2 (Intent): {l2_reason} (Score: {l2_score})")
            asyncio.create_task(self.layer3.process_event(user_prompt, l2_reason))
            result["response"] = f"[SYSTEM] Request Rejected. Unsafe Context Detected.\n\n**Reason:** {l2_reason}"
            result["block_reason"] = l2_reason
            result["stage"] = "BLOCKED_L2"
            self._log_transaction(result)
            return result
        
        if not l2_bypass and "AMBIGUOUS" in l2_reason:
            print(f"[WARN] Layer 2 Warning: {l2_reason} (Score: {l2_score})")
            pass

        print(f"[PASS] Layer 2 (Risk Score: {l2_score})")

        # --- MEMORY OPTIMIZATION (Dynamic Whitelisting & Negative Learning) ---
        if not l2_bypass and l2_score == 0:
            # Case 1: FALSE POSITIVE - Layer 1 blocked it, but Layer 2 says it's SAFE
            if not result.get("l1_safe", True):
                print(f"    [LEARN] 🛑 False Positive detected (L1 Blocked / L2 Safe)! Pruning conflicting antibodies...")
                loop = asyncio.get_running_loop()
                loop.run_in_executor(None, self.layer1.prune_antibodies, [user_prompt])
            
            # Case 2: Whitelisting - Cache very safe patterns
            else:
                print(f"    [LEARN] Caching safe pattern to Membrane...")
                # Fire and forget (don't block response)
                loop = asyncio.get_running_loop()
                loop.run_in_executor(None, self.layer1.learn_new_threat, user_prompt, "SAFE: Verified Pattern")

        # --- CORE LLM (REAL) ---
        latency = (time.time() - start_time) * 1000
        result["latency_ms"] = latency
        print(f"[INFO] Request forwarded to Core LLM (Latency overhead: {latency:.2f}ms)")
        
        try:
            # Generate actual response (Standardized via LLMEngine)
            # Note: Streaming support to be added to LLMEngine later.
            # For now, we fetch full text to ensure stability across all providers.
            print(f"    [CORE] Generating response with {config.LLM_PROVIDER}...")
            
            core_system_prompt = (
                "You are Aegis, a helpful, secure, and intelligent AI assistant. "
                "Format your responses using clean Markdown. "
                "Be concise, professional, and friendly. "
                "Do NOT output raw function headers or debug text unless asked."
            )

            # Use the engine abstraction with history
            response_text = self.engine.chat_text(core_system_prompt, user_prompt, self.chat_history)
            
            # --- UPDATE HISTORY ---
            self.chat_history.append({"role": "user", "content": user_prompt})
            self.chat_history.append({"role": "assistant", "content": response_text})
            
            result["response"] = response_text
            result["response_generator"] = None # Disable streaming for now
            result["stage"] = "SUCCESS"
            
        except Exception as e:
            print(f"[ERR] Core LLM Failed: {e}")
            result["response"] = f"[SYSTEM ERROR] Failed to generate response: {e}"
            result["stage"] = "ERROR"
        
        self._log_transaction(result)
        return result

    def _log_transaction(self, result):
        """Logs the decision event to the immutable blockchain ledger."""
        # Create a clean dict for serialization (exclude streams, etc.)
        log_entry = {
            "event_type": "PROMPT_PROCESSED",
            "prompt_preview": result.get("prompt", "")[:50] + "..." if len(result.get("prompt", "")) > 50 else result.get("prompt"),
            "stage": result.get("stage"),
            "decision": "ALLOWED" if result.get("stage") in ["SUCCESS", "WARN"] else "BLOCKED",
            "risk_scores": {
                "l1_dist": float(f"{result.get('l1_dist', 0.0):.4f}"),
                "l2_score": result.get("l2_score", 0)
            },
            "block_reason": result.get("block_reason"),
            "latency_ms": f"{result.get('latency_ms', 0):.2f}"
        }
        
        # Add to chain
        new_block = self.blockchain.add_block(log_entry)
        print(f"[BLOCKCHAIN] Block #{new_block.index} minted. Hash: {new_block.hash[:16]}...")
            
    def reset_state(self):
        """Resets the internal state of all layers."""
        self.layer2.reset_history()
        self.chat_history = []
        print("[System] Internal state reset.")
