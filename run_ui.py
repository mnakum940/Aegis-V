import uvicorn
import webbrowser
import threading
import time
import os
import sys

# Add src to path just in case
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

def open_browser():
    """Wait for server to start then open browser"""
    time.sleep(2) # Give server a moment
    print("[LAUNCHER] Opening Aegis V Neural Interface...")
    webbrowser.open("http://localhost:8000/")

def main():
    print("[LAUNCHER] Starting Aegis V System...")
    
    # Start browser in background
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start API Server
    # We import the app object string to allow hot reloading if needed, 
    # but here we run programmatically
    uvicorn.run("server.api:app", host="0.0.0.0", port=8000, reload=True, app_dir=".")

if __name__ == "__main__":
    main()
