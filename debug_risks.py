import json
import os

log_path = 'd:/DBS/2nd sem/self hardening - V14 (clean code + web GUI)/memory/training_data_log.json'

try:
    with open(log_path, 'r', encoding='utf-8') as f:
        logs = json.load(f)

    print(f"Total Logs: {len(logs)}")
    
    high = 0
    med = 0
    low = 0
    
    med_blocked = 0
    med_allowed = 0
    
    distinct_med_scores = set()

    for l in logs:
        score = l.get('risk_score', 0)
        decision = l.get('actual_decision', 'UNKNOWN')
        
        if score >= 80:
            high += 1
        elif score >= 40 and score < 80:
            med += 1
            distinct_med_scores.add(score)
            if decision == 'BLOCKED':
                med_blocked += 1
            else:
                med_allowed += 1
        else:
            low += 1

    print(f"High Risk (80+): {high}")
    print(f"Medium Risk (40-79): {med}")
    print(f"Low Risk (<40): {low}")
    
    if med > 0:
        print(f"\nMedium Risk Details:")
        print(f"  Blocked: {med_blocked}")
        print(f"  Allowed: {med_allowed}")
        print(f"  Distinct Scores: {distinct_med_scores}")
    else:
        print("\nNO Medium Risk entries found.")

except Exception as e:
    print(f"Error: {e}")
