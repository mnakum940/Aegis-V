import networkx as nx
import numpy as np
import time
from datetime import datetime

class ConversationGraph:
    def __init__(self):
        self.graph = nx.DiGraph()
        self.node_counter = 0
        
    def add_interaction(self, prompt, vector, risk_score, reason):
        """
        Adds a new interaction node and connects it to previous nodes based on similarity.
        """
        node_id = self.node_counter
        timestamp = datetime.now().isoformat()
        
        # Add Node
        self.graph.add_node(node_id, 
                            prompt=prompt, 
                            vector=vector, 
                            risk=risk_score, 
                            reason=reason,
                            time=timestamp)
        
        # Create Temporal Edge (Linear History)
        if node_id > 0:
            self.graph.add_edge(node_id - 1, node_id, type="temporal", weight=1.0)
            
        # Create Semantic Edges (Similarity)
        # Compare with last 5 nodes to see vector drift
        lookback = 5
        start_index = max(0, node_id - lookback)
        
        current_vec = np.array(vector)
        
        for prev_id in range(start_index, node_id):
            prev_node = self.graph.nodes[prev_id]
            prev_vec = np.array(prev_node['vector'])
            
            # Cosine Sim
            sim = self._cosine_similarity(current_vec, prev_vec)
            
            if sim > 0.5: # Only link if somewhat relevant
                self.graph.add_edge(prev_id, node_id, type="semantic", weight=sim, similarity=sim)
                
        self.node_counter += 1
        return node_id

    def detect_trajectory(self):
        """
        Analyzes the path of the last N turns.
        Returns: 'stable', 'escalating', 'diverging'
        """
        if self.node_counter < 3:
            return "stable", 0.0
            
        # Get last 3 nodes risks
        risks = [self.graph.nodes[i]['risk'] for i in range(self.node_counter-3, self.node_counter)]
        
        # Simple escalation check: 0 -> 20 -> 50...
        if risks[-1] > risks[-2] and risks[-1] > 20:
            return "escalating", risks[-1] - risks[-2]
            
        return "stable", 0.0

    def get_context_str(self, limit=5):
        """
        Returns a formatted string of recent history for LLM.
        NOTE: Risk scores are intentionally excluded to prevent bias.
        The judge should evaluate each prompt independently based on content.
        """
        start = max(0, self.node_counter - limit)
        context = []
        for i in range(start, self.node_counter):
            node = self.graph.nodes[i]
            context.append(f"Turn {i+1}: {node['prompt']}")
        return "\n".join(context)

    def _cosine_similarity(self, v1, v2):
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return np.dot(v1, v2) / (norm1 * norm2)

    def reset(self):
        self.graph.clear()
        self.node_counter = 0
