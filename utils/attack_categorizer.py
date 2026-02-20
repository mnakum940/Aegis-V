"""
Helper functions for categorizing attack prompts for dashboard visualization
"""

import re

def categorize_attack(prompt):
    """
    Categorize attack prompts into specific types for visualization
    
    Returns: category name (str)
    """
    prompt_lower = prompt.lower()
    
    # Check for different attack patterns
    
    # 1. Prompt Injection
    injection_patterns = [
        'ignore', 'forget', 'disregard', 'override', 'system',
        'admin mode', 'priority', 'inject', '|||', '---'
    ]
    if any(pattern in prompt_lower for pattern in injection_patterns):
        return 'Prompt Injection'
    
    # 2. Jailbreak
    jailbreak_patterns = [
        'dan', 'stan', 'developer mode', 'jailbreak', 'unrestricted',
        'break free', 'act as', 'pretend you are', 'simulate'
    ]
    if any(pattern in prompt_lower for pattern in jailbreak_patterns):
        return 'Jailbreak'
    
    # 3. Obfuscation (encoded attacks)
    if any(char in prompt for char in ['=', '0x', 'base64']) or \
       re.search(r'[0-9a-f]{2}(\s+[0-9a-f]{2})+', prompt) or \
       re.search(r'[0-7]{3,}', prompt):
        return 'Obfuscation'
    
    # 4. Social Engineering
    social_patterns = [
        'i am', 'i\'m', 'emergency', 'urgent', 'administrator',
        'it security', 'your supervisor', 'calling from', 'verify'
    ]
    if any(pattern in prompt_lower for pattern in social_patterns):
        return 'Social Engineering'
    
    # 5. Roleplay Attack
    roleplay_patterns = [
        'assume the role', 'play the character', 'roleplay',
        'you are now', 'from now on'
    ]
    if any(pattern in prompt_lower for pattern in roleplay_patterns):
        return 'Roleplay'
    
    # 6. System Prompt Manipulation
    if '<|im_start|>' in prompt or '<system>' in prompt or '###SYSTEM' in prompt:
        return 'System Prompt'
    
    # 7. Technical False Positive (legitimate tech queries that sound suspicious)
    tech_patterns = [
        'kill', 'terminate', 'rm ', 'del ', 'drop table',
        'shutdown', 'firewall', 'process'
    ]
    if any(pattern in prompt_lower for pattern in tech_patterns):
        return 'Technical (Suspicious)'
    
    # Default
    return 'Other Attack'

def get_category_color(category):
    """Get consistent color for each attack category"""
    colors = {
        'Prompt Injection': '#ff3366',    # Red
        'Jailbreak': '#ff6b35',           # Orange-red
        'Obfuscation': '#f7931e',         # Orange
        'Social Engineering': '#fdc500',  # Yellow
        'Roleplay': '#c1cc00',            # Yellow-green
        'System Prompt': '#7ac943',       # Green
        'Technical (Suspicious)': '#00baad', # Teal
        'Other Attack': '#888888'         # Gray
    }
    return colors.get(category, '#888888')
