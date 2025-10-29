import matplotlib.pyplot as plt
from matplotlib.patches import Patch, FancyBboxPatch
from matplotlib.patches import FancyArrowPatch
import json
import sys
import base64
from io import BytesIO
import numpy as np

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
    
    fig, ax = plt.subplots(figsize=(10, 10))
    
    pos = {}
    size = 5
    for node in grid_data:
        node_id = node["id"]
        x = node_id % size
        y = size - 1 - (node_id // size)
        pos[node_id] = (x, y)
    
    # Helper function to check if connection is adjacent
    def is_adjacent(id1, id2):
        x1, y1 = pos[id1]
        x2, y2 = pos[id2]
        return abs(x1 - x2) <= 1 and abs(y1 - y2) <= 1
    
    # Helper function to create curved line
    def get_control_point(x1, y1, x2, y2, curve_strength=0.3):
        """Calculate control point for quadratic Bezier curve"""
        # Midpoint
        mid_x = (x1 + x2) / 2
        mid_y = (y1 + y2) / 2
        
        # Perpendicular vector
        dx = x2 - x1
        dy = y2 - y1
        length = np.sqrt(dx**2 + dy**2)
        
        if length == 0:
            return mid_x, mid_y
        
        # Perpendicular offset (curve away from center)
        perp_x = -dy / length
        perp_y = dx / length
        
        # Control point offset from midpoint
        offset = curve_strength * length
        control_x = mid_x + perp_x * offset
        control_y = mid_y + perp_y * offset
        
        return control_x, control_y
    
    # Separate connections into adjacent and non-adjacent
    adjacent_connections = []
    non_adjacent_connections = []
    processed_pairs = set()
    
    for node in grid_data:
        node_id = node["id"]
        for conn in node["connections"]:
            # Skip if we've already drawn this connection (undirected)
            pair = tuple(sorted([node_id, conn]))
            if pair in processed_pairs:
                continue
            processed_pairs.add(pair)
            
            if is_adjacent(node_id, conn):
                adjacent_connections.append((node_id, conn))
            else:
                non_adjacent_connections.append((node_id, conn))
    
    # Draw adjacent connections (straight, gray, thin)
    for node_id, conn in adjacent_connections:
        x_values = [pos[node_id][0], pos[conn][0]]
        y_values = [pos[node_id][1], pos[conn][1]]
        ax.plot(x_values, y_values, color='gray', linewidth=2, zorder=1, alpha=0.6)
    
    # Draw non-adjacent connections (curved, colorful, thicker, with arrows)
    colors = ['#FF1493', '#00CED1', '#FFD700', '#FF4500', '#9370DB', 
              '#32CD32', '#FF69B4', '#1E90FF', '#FFA500', '#00FA9A']
    
    for idx, (node_id, conn) in enumerate(non_adjacent_connections):
        x1, y1 = pos[node_id]
        x2, y2 = pos[conn]
        
        # Get control point for curve
        cx, cy = get_control_point(x1, y1, x2, y2, curve_strength=0.25)
        
        # Create curved path using quadratic Bezier
        t = np.linspace(0, 1, 100)
        curve_x = (1-t)**2 * x1 + 2*(1-t)*t * cx + t**2 * x2
        curve_y = (1-t)**2 * y1 + 2*(1-t)*t * cy + t**2 * y2
        
        # Choose color
        color = colors[idx % len(colors)]
        
        # Draw curved line with dashed style
        ax.plot(curve_x, curve_y, color=color, linewidth=2.5, 
                linestyle='--', zorder=2, alpha=0.8)
        
        # Add small circles at endpoints to show connection clearly
        ax.plot(x1, y1, 'o', color=color, markersize=4, zorder=3, alpha=0.8)
        ax.plot(x2, y2, 'o', color=color, markersize=4, zorder=3, alpha=0.8)
        
        # Add connection label at midpoint
        label_x = (1-0.5)**2 * x1 + 2*(1-0.5)*0.5 * cx + 0.5**2 * x2
        label_y = (1-0.5)**2 * y1 + 2*(1-0.5)*0.5 * cy + 0.5**2 * y2
        ax.text(label_x, label_y, f'{node_id}↔{conn}', 
                fontsize=7, color=color, weight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', 
                         edgecolor=color, alpha=0.8),
                ha='center', va='center', zorder=4)
    
    # Draw nodes with labels
    for node in grid_data:
        x, y = pos[node["id"]]
        node_type = node["type"]
        color = color_map.get(node_type, "white")
        
        # Draw node circle
        ax.scatter(x, y, s=800, color=color, edgecolors='black', 
                  linewidths=2.5, zorder=5)
        
        # Add node ID label
        ax.text(x, y, str(node["id"]), fontsize=11, weight='bold',
               ha='center', va='center', zorder=6, color='white' if node_type in ['Shadow Realm', 'Combat'] else 'black')
    
    # Draw player positions
    if players_data:
        player_colors = ['#FF6B6B', '#4ECDC4', '#95E1D3']  # Red, Teal, Mint
        player_markers = ['o', 's', '^']  # Circle, Square, Triangle
        
        for idx, player in enumerate(players_data):
            player_pos = player.get('position')
            player_name = player.get('name', f'Player {idx + 1}')
            if player_pos is not None and player_pos in pos:
                x, y = pos[player_pos]
                # Draw player marker with distinct shape
                offset = (idx - 1) * 0.25
                ax.scatter(x + offset * 0.4, y - 0.3, s=250, 
                          color=player_colors[idx % len(player_colors)], 
                          edgecolors='white', linewidth=2.5, zorder=7,
                          marker=player_markers[idx % len(player_markers)])
                
                # Add player name label below node
                ax.text(x + offset * 0.4, y - 0.5, player_name[:8], 
                       fontsize=8, weight='bold',
                       ha='center', va='top', zorder=7,
                       color=player_colors[idx % len(player_colors)],
                       bbox=dict(boxstyle='round,pad=0.3', 
                                facecolor='white', alpha=0.9))
    
    # Create legend
    legend_elements = [Patch(facecolor=color, edgecolor='black', label=type_name)
                       for type_name, color in color_map.items()]
    
    # Add connection type indicators to legend
    legend_elements.append(plt.Line2D([0], [0], color='gray', linewidth=2, 
                                     label='Adjacent Connection'))
    legend_elements.append(plt.Line2D([0], [0], color='purple', linewidth=2.5, 
                                     linestyle='--', label='Non-Adjacent Connection'))
    
    # Add player legend if players exist
    if players_data:
        player_colors = ['#FF6B6B', '#4ECDC4', '#95E1D3']
        player_markers = ['o', 's', '^']
        for idx, player in enumerate(players_data):
            legend_elements.append(plt.Line2D([0], [0], marker=player_markers[idx % len(player_markers)], 
                                             color='w', 
                                             markerfacecolor=player_colors[idx % len(player_colors)], 
                                             markersize=10, 
                                             label=player.get('name', f'Player {idx + 1}')))
    
    ax.legend(handles=legend_elements, title="Legend", 
             bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9)
    
    # Styling
    ax.set_xlim(-0.8, size - 0.2)
    ax.set_ylim(-0.8, size - 0.2)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_aspect('equal')
    ax.set_title("Blind Crown Quest - Final Map", fontsize=18, weight='bold', pad=20)
    ax.set_facecolor('#F5F5DC')  # Beige background
    plt.grid(False)
    plt.tight_layout()
    
    # Save to bytes
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=120, bbox_inches='tight', facecolor='#F5F5DC')
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