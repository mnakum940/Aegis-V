# Aegis V Configuration

# Thresholds
RISK_THRESHOLD_BLOCK = 70
RISK_THRESHOLD_AMBIGUOUS = 40

# Human-In-The-Loop Settings
HITL_ENABLED = True
HITL_LOG_FILE = "../review_queue.json"

# Models Provider Configuration
# Options: 'ollama', 'openai', 'anthropic', 'google'
LLM_PROVIDER = 'ollama'  # Switched back to local Ollama for unlimited prompts

# Local Ollama Models
# Ensure you have run: 'ollama pull nomic-embed-text' and 'ollama pull llama3.2'
MODEL_EMBEDDING = 'nomic-embed-text'
MODEL_INFERENCE =  'llama3.2'      # 'mistral'
OLLAMA_URL = 'http://localhost:11434'

# Online API Configuration
# Set API keys via environment variables for security:
#   Windows: set OPENAI_API_KEY=sk-...
#   Linux/Mac: export OPENAI_API_KEY=sk-...
import os
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', 'AIzaSyDe5tvwNGfNknUoNffgiBVCkagTnR8GbTc')

# Online Model Selection
# Google: 'gemini-2.5-flash' (latest, fast), 'gemini-2.5-pro' (best), 'gemini-flash-latest' (always current)
# OpenAI: 'gpt-4o-mini' (fast, cheap), 'gpt-4o' (best), 'gpt-4-turbo'
# Anthropic: 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'
MODEL_INFERENCE_ONLINE = 'gemini-2.5-flash'  # For Layer 2/3 inference (was gemini-1.5-flash)
MODEL_EMBEDDING_ONLINE = 'text-embedding-004'  # Google's embedding model (768 dims)

# Layer 1 Settings
SIMILARITY_THRESHOLD = 0.60  # Cosine distance threshold (lower is closer for some metrics, depends on implementation)
                             # For cosine similarity, 1.0 is identical. We will use cosine similarity.
                             # If sim > 0.60 -> Match.

# Simulation Settings
# Set to False to use real Ollama models
# Set to True to force mock logic
SIMULATION_MODE = False 

# Admin Security
# SHA-256 Hash of the admin password. 
# Default is 'admin123' -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
# Use a tool like https://xorbin.com/tools/sha256-hash-calculator to generate your own.
ADMIN_PASSWORD_HASH = "841511121095c879a2c1b69cb24fbe10d45e755a74e218ff874a71dd673524d0" 
#mathewmeet

# Performance Tuning
# Limit conversation history to prevent O(N^2) context bloat.
MAX_HISTORY_TURNS = 10 

# Parallel Execution
# Set to False if using local Ollama (prevents model swapping/thrashing).
# Set to True if using online APIs (OpenAI/Google) or multiple GPUs.
PARALLEL_LAYERS = (LLM_PROVIDER != 'ollama')

# Hybrid Optimization (Crucial for Local Latency)
# If True, offloads embeddings to prevent Ollama model swapping.
# Providers: 'google' (Online, Rate Limits), 'local_cpu' (Fast, Offline, No Limits)
USE_HYBRID_EMBEDDINGS = False
HYBRID_EMBEDDING_PROVIDER = 'local_cpu' 
MODEL_EMBEDDING_CPU = 'all-MiniLM-L6-v2' # Standard fast embedding model

# Multi-Tenant Settings
import os
BASE_MEMORY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'memory'))
CLIENTS_DIR = os.path.join(BASE_MEMORY_DIR, 'clients')

def get_tenant_dir(client_id: str) -> str:
    """Returns the absolute path to a specific tenant's memory directory."""
    tenant_dir = os.path.join(CLIENTS_DIR, client_id)
    os.makedirs(tenant_dir, exist_ok=True)
    return tenant_dir
