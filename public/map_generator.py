import matplotlib.pyplot as plt
from matplotlib.patches import Patch
import json
import sys
import base64
from io import BytesIO

def generate_map_image(grid_data, players_data=None):
    color_map = {
        "Shop": "gold",
        "Neutral": "lightgray",
        "Teleport": "purple",
        "Bad": "red",
        "Good": "green",
        "Crown": "orange",
        "Start": "blue",
        "Combat": "brown",
        "Shadow Realm": "black"
    }
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    pos = {}
    size = 5
    for node in grid_data:
        node_id = node["id"]
        x = node_id % size
        y = size - 1 - (node_id // size)
        pos[node_id] = (x, y)
    
    # Draw connections
    for node in grid_data:
        node_id = node["id"]
        for conn in node["connections"]:
            x_values = [pos[node_id][0], pos[conn][0]]
            y_values = [pos[node_id][1], pos[conn][1]]
            ax.plot(x_values, y_values, color='gray', linewidth=1, zorder=1)
    
    # Draw nodes
    for node in grid_data:
        x, y = pos[node["id"]]
        node_type = node["type"]
        color = color_map.get(node_type, "white")
        ax.scatter(x, y, s=600, color=color, edgecolors='black', zorder=2)
    
    # Draw player positions
    if players_data:
        player_colors = ['#FF6B6B', '#4ECDC4', '#95E1D3']  # Red, Teal, Mint
        for idx, player in enumerate(players_data):
            player_pos = player.get('position')
            player_name = player.get('name', f'Player {idx + 1}')
            if player_pos is not None and player_pos in pos:
                x, y = pos[player_pos]
                # Draw player marker (slightly offset if multiple players on same space)
                offset = (idx - 1) * 0.15
                ax.scatter(x + offset * 0.3, y + offset * 0.3, s=200, color=player_colors[idx % len(player_colors)], 
                          edgecolors='white', linewidth=2, zorder=3, marker='o')
    
    # Create legend
    legend_elements = [Patch(facecolor=color, edgecolor='black', label=type_name)
                       for type_name, color in color_map.items()]
    
    # Add player legend if players exist
    if players_data:
        player_colors = ['#FF6B6B', '#4ECDC4', '#95E1D3']
        for idx, player in enumerate(players_data):
            legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                             markerfacecolor=player_colors[idx % len(player_colors)], 
                                             markersize=8, label=player.get('name', f'Player {idx + 1}')))
    
    ax.legend(handles=legend_elements, title="Legend", bbox_to_anchor=(1.05, 1), loc='upper left')
    
    # Styling
    ax.set_xlim(-1, size)
    ax.set_ylim(-1, size)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_aspect('equal')
    ax.set_title("Map", fontsize=16)
    plt.grid(False)
    plt.tight_layout()
    
    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    
    # Encode to base64
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    
    return img_base64

if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            sys.stderr.write("No grid data provided\n")
            sys.exit(1)
        
        grid_data = json.loads(sys.argv[1])
        players_data = None
        
        # Parse players data if provided
        if len(sys.argv) > 2:
            players_data = json.loads(sys.argv[2])
        
        img_base64 = generate_map_image(grid_data, players_data)
        print(img_base64)
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Invalid JSON: {str(e)}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.exit(1)