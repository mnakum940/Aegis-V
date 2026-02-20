import sys
import os

print(f"[INFO] Python Version: {sys.version}")
print(f"[INFO] Python Executable: {sys.executable}")
print(f"[INFO] CWD: {os.getcwd()}")
print("[INFO] sys.path:")
for p in sys.path:
    print(f"  - {p}")

print("\n------------------------------------------------------------")
print("[TEST] Importing Dependencies...")
print("------------------------------------------------------------")

missing = []

try:
    import uvicorn
    print(f"[OK] uvicorn ({uvicorn.__version__}) found at {os.path.dirname(uvicorn.__file__)}")
except ImportError as e:
    print(f"[ERROR] uvicorn MISSING: {e}")
    missing.append("uvicorn")

try:
    import fastapi
    print(f"[OK] fastapi ({fastapi.__version__}) found at {os.path.dirname(fastapi.__file__)}")
except ImportError as e:
    print(f"[ERROR] fastapi MISSING: {e}")
    missing.append("fastapi")

try:
    import sentence_transformers
    print(f"[OK] sentence_transformers ({sentence_transformers.__version__}) found at {os.path.dirname(sentence_transformers.__file__)}")
except ImportError as e:
    print(f"[ERROR] sentence_transformers MISSING: {e}")
    missing.append("sentence-transformers")

try:
    import networkx
    print(f"[OK] networkx ({networkx.__version__}) found at {os.path.dirname(networkx.__file__)}")
except ImportError as e:
    print(f"[ERROR] networkx MISSING: {e}")
    missing.append("networkx")

print("\n------------------------------------------------------------")
if missing:
    print(f"[FAIL] Missing packages: {', '.join(missing)}")
    print(f"Run debugging command: {sys.executable} -m pip install {' '.join(missing)}")
else:
    print("[SUCCESS] All dependencies are installed correctly!")
