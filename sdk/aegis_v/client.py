import requests
from typing import Dict, Any, Optional

class AegisAPIError(Exception):
    """Exception raised for API errors"""
    pass

class AegisClient:
    """
    Client for interacting with the Aegis V API.
    Used by LLM startups to securely filter prompts before sending them to major LLM providers.
    """
    def __init__(self, api_key: str, base_url: str = "https://api.aegis-v.com"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key
        }

    def protect(self, prompt: str) -> Dict[str, Any]:
        """
        Sends the prompt through the Aegis V pipeline.
        
        Args:
            prompt (str): The user input prompt to validate.
            
        Returns:
            Dict containing the security decision and metadata.
        """
        url = f"{self.base_url}/v1/chat"
        payload = {"message": prompt}
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            
            if response.status_code == 403:
                raise AegisAPIError("403 Forbidden: Invalid or revoked API Key.")
            if response.status_code == 429:
                raise AegisAPIError("429 Too Many Requests: Rate limit exceeded.")
                
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise AegisAPIError(f"Aegis API Request failed: {str(e)}")

    def feedback(self, prompt: str, expected_label: str, actual_decision: str, correct: bool) -> Dict[str, Any]:
        """
        Provide supervised feedback to train Aegis V.
        """
        url = f"{self.base_url}/v1/feedback"
        payload = {
            "prompt": prompt,
            "expected_label": expected_label,
            "actual_decision": actual_decision,
            "correct": correct
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise AegisAPIError(f"Aegis API Feedback failed: {str(e)}")
