import abc
import os
import config
from typing import List, Dict, Any, Union

class LLMEngine(abc.ABC):
    """
    Abstract Base Class for LLM Providers (Ollama, OpenAI, Anthropic, etc.)
    """
    
    @abc.abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """Returns a vector embedding for the given text."""
        pass

    @abc.abstractmethod
    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Sends a chat request and expects a JSON response.
        Returns a dict (parsed JSON).
        """
        pass

    @abc.abstractmethod
    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        """
        Sends a chat request and returns raw text response.
        History format: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
        """
        pass

class LocalCPUEngine(LLMEngine):
    """
    Implementation for local CPU embeddings using SentenceTransformers.
    Zero GPU usage, very fast.
    """
    def __init__(self):
        try:
            # Common fix for hanging in Docker/WSL
            import os
            os.environ["TOKENIZERS_PARALLELISM"] = "false"
            from sentence_transformers import SentenceTransformer
            
            model_name = getattr(config, 'MODEL_EMBEDDING_CPU', 'all-MiniLM-L6-v2')
            print(f"    [Engine] Loading model '{model_name}'... (This may take a moment)")
            
            # Force CPU to avoid stealing VRAM from Ollama
            self.model = SentenceTransformer(model_name, device='cpu')
            print(f"    [Engine] Model Loaded Successfully.")
            print(f"    [Engine] Local CPU Provider ({model_name}) - Running on CPU")
        except ImportError:
            raise ImportError("sentence-transformers not installed. Run: pip install sentence-transformers")

    def get_embedding(self, text: str) -> List[float]:
        # Returns numpy array, convert to list
        return self.model.encode(text).tolist()

    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        return {} # Not supported

    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        return "" # Not supported

class OllamaEngine(LLMEngine):
    """
    Implementation for local Ollama usage.
    """
    def __init__(self):
        import ollama
        self.client = ollama
        self._cloud_embedder = None
        
        # Initialize Hybrid Embedder
        if getattr(config, 'USE_HYBRID_EMBEDDINGS', False):
            provider = getattr(config, 'HYBRID_EMBEDDING_PROVIDER', 'google')
            print(f"    [Engine] Hybrid Mode: Offloading embeddings to '{provider}' to prevent local swapping.")
            
            try:
                if provider == 'local_cpu':
                    self._cloud_embedder = LocalCPUEngine()
                else: 
                    # Default to Google
                    self._cloud_embedder = GoogleEngine()
            except Exception as e:
                print(f"    [Warn] Hybrid Embedder Init Failed: {e}. Falling back to local Ollama.")

        print(f"    [Engine] Initialized Ollama Provider (Embed: {config.MODEL_EMBEDDING}, Inf: {config.MODEL_INFERENCE})")

    def get_embedding(self, text: str) -> List[float]:
        # Path 1: Hybrid Embedding (Fast, no partial unload)
        if self._cloud_embedder:
            try:
                return self._cloud_embedder.get_embedding(text)
            except Exception as e:
                print(f"    [Warn] Hybrid Embedding Failed: {e}. Falling back to local.")
        
        # Path 2: Local Ollama Embedding (Slow if swapping)
        try:
            response = self.client.embeddings(model=config.MODEL_EMBEDDING, prompt=text)
            return response['embedding']
        except Exception as e:
            print(f"    [ERR] Ollama Embedding Failed: {e}")
            return [0.0] * 768

    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        import json
        try:
            response = self.client.chat(model=config.MODEL_INFERENCE, messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ], format='json')
            
            content = response['message']['content']
            return json.loads(content)
        except Exception as e:
            print(f"    [ERR] Ollama JSON Chat Failed: {e}")
            return {}

    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        try:
            messages = [{'role': 'system', 'content': system_prompt}]
            if history:
                messages.extend(history)
            messages.append({'role': 'user', 'content': user_prompt})
            
            response = self.client.chat(model=config.MODEL_INFERENCE, messages=messages)
            return response['message']['content']
        except Exception as e:
            print(f"    [ERR] Ollama Text Chat Failed: {e}")
            return ""

class OpenAIEngine(LLMEngine):
    """
    Implementation for OpenAI API (GPT-4, GPT-3.5, etc.)
    """
    def __init__(self):
        try:
            from openai import OpenAI
            import json
            self.json = json
            
            api_key = getattr(config, 'OPENAI_API_KEY', None)
            if not api_key:
                raise ValueError("OPENAI_API_KEY not found in config or environment")
            
            self.client = OpenAI(api_key=api_key)
            self.model_inference = getattr(config, 'MODEL_INFERENCE_ONLINE', 'gpt-4o-mini')
            self.model_embedding = getattr(config, 'MODEL_EMBEDDING_ONLINE', 'text-embedding-3-small')
            
            print(f"    [Engine] OpenAI Provider ({self.model_inference})")
        except ImportError:
            raise ImportError("OpenAI library not installed. Run: pip install openai")
        except Exception as e:
            raise RuntimeError(f"OpenAI initialization failed: {e}")

    def get_embedding(self, text: str) -> List[float]:
        try:
            response = self.client.embeddings.create(
                model=self.model_embedding,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"    [ERR] OpenAI Embedding Failed: {e}")
            return [0.0] * 1536

    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        try:
            response = self.client.chat.completions.create(
                model=self.model_inference,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            return self.json.loads(content)
        except Exception as e:
            print(f"    [ERR] OpenAI JSON Chat Failed: {e}")
            return {"risk_score": 0, "reason": f"API Error: {str(e)}"}

    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        try:
            messages = []
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": user_prompt})
            
            messages.insert(0, {"role": "system", "content": system_prompt})

            response = self.client.chat.completions.create(
                model=self.model_inference,
                messages=messages,
                temperature=0.3,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"    [ERR] OpenAI Text Chat Failed: {e}")
            return ""

class AnthropicEngine(LLMEngine):
    """
    Implementation for Anthropic API (Claude)
    """
    def __init__(self):
        try:
            from anthropic import Anthropic
            import json
            self.json = json
            
            api_key = getattr(config, 'ANTHROPIC_API_KEY', None)
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY not found in config")
            
            self.client = Anthropic(api_key=api_key)
            self.model = getattr(config, 'MODEL_INFERENCE_ONLINE', 'claude-3-haiku-20240307')
            
            print(f"    [Engine] Anthropic Provider ({self.model})")
        except ImportError:
            raise ImportError("Anthropic library not installed. Run: pip install anthropic")

    def get_embedding(self, text: str) -> List[float]:
        # Anthropic doesn't provide embeddings
        print("    [Warn] Using OpenAI for embeddings with Anthropic")
        try:
            from openai import OpenAI
            client = OpenAI(api_key=getattr(config, 'OPENAI_API_KEY', ''))
            response = client.embeddings.create(model="text-embedding-3-small", input=text)
            return response.data[0].embedding
        except:
            return [0.0] * 1536

    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return self.json.loads(response.content[0].text)
        except Exception as e:
            print(f"    [ERR] Anthropic Failed: {e}")
            return {"risk_score": 0, "reason": f"API Error: {str(e)}"}

    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        try:
            messages = []
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": user_prompt})

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.3,
                system=system_prompt,
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            print(f"    [ERR] Anthropic Failed: {e}")
            return ""

class GoogleEngine(LLMEngine):
    """
    Implementation for Google Gemini API
    """
    def __init__(self):
        try:
            # Using the new google.genai package (google.generativeai is deprecated)
            from google import genai
            from google.genai import types
            import json
            self.genai = genai
            self.types = types
            self.json = json
            self._cloud_embedder = None
            
            api_key = getattr(config, 'GOOGLE_API_KEY', None)
            if not api_key:
                raise ValueError("GOOGLE_API_KEY not found in config")
            
            # Configure client
            client = genai.Client(api_key=api_key)
            self.client = client
            
            # Model names - use latest Gemini 2.x models
            self.model_inference = getattr(config, 'MODEL_INFERENCE_ONLINE', 'gemini-2.0-flash-exp')
            self.model_embedding = getattr(config, 'MODEL_EMBEDDING_ONLINE', 'text-embedding-004')
            
            # Initialize Hybrid Embedder (e.g. Local CPU)
            if getattr(config, 'USE_HYBRID_EMBEDDINGS', False):
                provider = getattr(config, 'HYBRID_EMBEDDING_PROVIDER', 'local_cpu')
                print(f"    [Engine] Hybrid Mode: Offloading embeddings to '{provider}' (Fast).")
                try:
                    if provider == 'local_cpu':
                        self._cloud_embedder = LocalCPUEngine()
                except Exception as e:
                    print(f"    [Warn] Hybrid Embedder Init Failed: {e}. Falling back to Google API.")
            
            print(f"    [Engine] Google Gemini Provider ({self.model_inference}) - New API")
        except ImportError:
            raise ImportError("Google GenAI library not installed. Run: pip install google-genai")
        except Exception as e:
            raise RuntimeError(f"Google Gemini initialization failed: {e}")

    def get_embedding(self, text: str) -> List[float]:
        # Path 1: Hybrid Embedding (Fast Local CPU)
        if self._cloud_embedder:
            try:
                return self._cloud_embedder.get_embedding(text)
            except Exception as e:
                print(f"    [Warn] Hybrid Embedding Failed: {e}. Falling back to Google API.")

        # Path 2: Google API Embedding (Slower, >100ms)
        try:
            result = self.genai.embed_content(
                model=f"models/{self.model_embedding}",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"    [ERR] Google Embedding Failed: {e}")
            return [0.0] * 768  # text-embedding-004 dimension

    def chat_json(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        try:
            # Gemini doesn't have separate system/user roles in generate_content
            # Combine prompts and request JSON explicitly
            full_prompt = f"""
{system_prompt}

User Query: {user_prompt}

CRITICAL: You must respond with ONLY valid JSON. No markdown, no code blocks, just the raw JSON object.
Example format: {{"risk_score": 50, "reason": "explanation"}}
"""
            
            response = self.client.models.generate_content(
                model=self.model_inference,
                contents=full_prompt,
                config=self.types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=500,
                )
            )
            
            content = response.text.strip()
            
            # Clean up markdown code blocks if present
            if content.startswith('```json'):
                content = content[7:]
            elif content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            content = content.strip()
            
            # Parse JSON
            return self.json.loads(content)
            
        except self.json.JSONDecodeError as e:
            print(f"    [ERR] Google Gemini JSON parse failed: {e}")
            print(f"    [ERR] Raw response: {content[:200]}")
            return {"risk_score": 0, "reason": "JSON parse error"}
        except Exception as e:
            print(f"    [ERR] Google Gemini Failed: {e}")
            return {"risk_score": 0, "reason": f"API Error: {str(e)}"}

    def chat_text(self, system_prompt: str, user_prompt: str, history: List[Dict[str, str]] = None) -> str:
        try:
            # Construct prompt with history manually for Google (as it often uses specific history objects, 
            # but string concatenation is safest generic approach for now)
            history_text = ""
            if history:
                for msg in history:
                    role = "User" if msg['role'] == 'user' else "Model"
                    history_text += f"{role}: {msg['content']}\n\n"
            
            full_prompt = f"{system_prompt}\n\n{history_text}User: {user_prompt}"
            
            response = self.client.models.generate_content(
                model=self.model_inference,
                contents=full_prompt,
                config=self.types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=1000,
                )
            )
            
            return response.text
        except Exception as e:
            print(f"    [ERR] Google Gemini Failed: {e}")
            return ""

_engine_instance = None

def get_engine() -> LLMEngine:
    """Factory method to get the configured engine (Singleton)."""
    global _engine_instance
    if _engine_instance:
        return _engine_instance
        
    provider = getattr(config, 'LLM_PROVIDER', 'ollama').lower()
    
    if provider == 'openai':
        _engine_instance = OpenAIEngine()
    elif provider == 'anthropic':
        _engine_instance = AnthropicEngine()
    elif provider == 'google':
        _engine_instance = GoogleEngine()
    else:
        _engine_instance = OllamaEngine()
        
    return _engine_instance
