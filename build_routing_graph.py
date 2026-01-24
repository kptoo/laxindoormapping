import json

def make_bidirectional(input_file, output_file):
    print("Loading routing graph...")
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    nodes = data['nodes']
    edges = data['edges']
    
    print(f"Original: {len(nodes)} nodes, {len(edges)} edges")
    
    # Create a set of existing edges for fast lookup
    edge_set = set()
    for edge in edges:
        edge_set.add((edge['from'], edge['to']))
    
    # Add reverse edges
    new_edges = []
    added_count = 0
    
    for edge in edges:
        from_id = edge['from']
        to_id = edge['to']
        weight = edge.get('weight', 0)
        edge_type = edge.get('type', 'walk')
        
        # Check if reverse edge exists
        if (to_id, from_id) not in edge_set:
            # Add reverse edge
            new_edges.append({
                'from': to_id,
                'to': from_id,
                'weight': weight,
                'type': edge_type
            })
            edge_set.add((to_id, from_id))
            added_count += 1
    
    # Combine original and new edges
    all_edges = edges + new_edges
    
    print(f"Added {added_count} reverse edges")
    print(f"Final: {len(nodes)} nodes, {len(all_edges)} edges")
    
    # Save the fixed graph
    output_data = {
        'nodes': nodes,
        'edges': all_edges
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"✅ Fixed graph saved to {output_file}")
    
    # Verify
    print("\nVerifying bidirectionality...")
    edge_check = set()
    for edge in all_edges:
        edge_check.add((edge['from'], edge['to']))
    
    bidirectional = 0
    unidirectional = 0
    
    checked = set()
    for edge in all_edges:
        from_id = edge['from']
        to_id = edge['to']
        
        if (from_id, to_id) in checked:
            continue
        
        checked.add((from_id, to_id))
        checked.add((to_id, from_id))
        
        if (to_id, from_id) in edge_check:
            bidirectional += 1
        else:
            unidirectional += 1
    
    print(f"Bidirectional connections: {bidirectional}")
    print(f"Unidirectional connections: {unidirectional}")
    
    if unidirectional == 0:
        print("✅ All edges are now bidirectional!")
    else:
        print(f"⚠️  Still have {unidirectional} unidirectional edges")

if __name__ == "__main__":
    make_bidirectional("routing_graph.json", "routing_graph_fixed.json")