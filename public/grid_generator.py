import random
import json
import sys
from collections import deque

def create_grid(start_space_id=12):
    spaces = [
        {"id": i, "type": "Neutral", "connections": []}
        for i in range(25)
    ]
    spaces[start_space_id]["type"] = "Start"
    
    # Assign unique space types
    types = ["Crown", "Shadow Realm", "Teleport"] + ["Combat"] * 2 + ["Good"] * 3 + ["Bad"] * 3 + ["Shop"] * 3
    available_ids = [i for i in range(25) if i != start_space_id]
    random.shuffle(available_ids)
    for i, t in enumerate(types):
        spaces[available_ids[i]]["type"] = t
    
    # Define outside spaces (0-4, 5, 9, 10, 14, 15, 19, 20-24)
    outside = {0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24}
    
    # Helper to get row and column
    def get_coords(space_id):
        return space_id // 5, space_id % 5
    
    # Helper to get direction from space1 to space2
    def get_direction(from_id, to_id):
        r1, c1 = get_coords(from_id)
        r2, c2 = get_coords(to_id)
        dr, dc = r2 - r1, c2 - c1
        if dr == 0 or dc == 0:  # Same row or column
            return None
        if abs(dr) > 1 or abs(dc) > 1:  # Non-adjacent
            if dr < 0 and dc < 0:
                return "NorthWest"
            if dr < 0 and dc > 0:
                return "NorthEast"
            if dr > 0 and dc < 0:
                return "SouthWest"
            if dr > 0 and dc > 0:
                return "SouthEast"
        # Adjacent connections
        if dr == -1 and dc == 0:
            return "North"
        if dr == 1 and dc == 0:
            return "South"
        if dr == 0 and dc == 1:
            return "East"
        if dr == 0 and dc == -1:
            return "West"
        if dr == -1 and dc == -1:
            return "NorthWest"
        if dr == -1 and dc == 1:
            return "NorthEast"
        if dr == 1 and dc == -1:
            return "SouthWest"
        if dr == 1 and dc == 1:
            return "SouthEast"
        return None
    
    # Get cardinal adjacent spaces
    def get_adjacent_cardinal(space_id):
        r, c = get_coords(space_id)
        adjacent = []
        for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:  # Cardinal only
            r_new, c_new = r + dr, c + dc
            if 0 <= r_new < 5 and 0 <= c_new < 5:
                adjacent.append(r_new * 5 + c_new)
        return adjacent
    
    # Get diagonal adjacent spaces
    def get_adjacent_diagonal(space_id):
        r, c = get_coords(space_id)
        adjacent = []
        for dr, dc in [(-1,-1), (-1,1), (1,-1), (1,1)]:  # Diagonal only
            r_new, c_new = r + dr, c + dc
            if 0 <= r_new < 5 and 0 <= c_new < 5:
                adjacent.append(r_new * 5 + c_new)
        return adjacent
    
    # BFS to check connectivity and Crown distance
    def is_valid_grid(spaces, crown_id, start_id):
        visited = set()
        queue = deque([start_id])
        visited.add(start_id)
        steps_to_crown = None
        while queue:
            current = queue.popleft()
            if current == crown_id:
                steps_to_crown = len(bfs_path(spaces, start_id, crown_id)) - 1
            for next_space in spaces[current]["connections"]:
                if next_space not in visited:
                    visited.add(next_space)
                    queue.append(next_space)
        incoming_to_crown = sum(1 for s in spaces if crown_id in s["connections"])
        return len(visited) == 25 and steps_to_crown >= 3 and incoming_to_crown == 1
    
    def bfs_path(spaces, start, target):
        queue = deque([(start, [start])])
        visited = set([start])
        while queue:
            current, path = queue.popleft()
            if current == target:
                return path
            for next_space in spaces[current]["connections"]:
                if next_space not in visited:
                    visited.add(next_space)
                    queue.append((next_space, path + [next_space]))
        return []
    
    # Phase 1: Connect outside spaces to all cardinal adjacent outside spaces
    for space_id in outside:
        if spaces[space_id]["type"] == "Crown":
            continue
        adj_outside = get_adjacent_cardinal(space_id)
        for adj in adj_outside:
            if adj in outside and adj not in spaces[space_id]["connections"]:
                spaces[space_id]["connections"].append(adj)
                if space_id not in spaces[adj]["connections"]:
                    spaces[adj]["connections"].append(space_id)
    
    # Phase 2: Non-adjacent connections (5% chance, unique directions, stop after connecting in a quadrant)
    ordinal_directions = ["NorthWest", "NorthEast", "SouthWest", "SouthEast"]
    for space_id in range(25):
        if spaces[space_id]["type"] == "Crown":
            continue
        r, c = get_coords(space_id)
        non_adjacent = [i for i in range(25) if i != space_id and get_coords(i)[0] != r and get_coords(i)[1] != c]
        non_adjacent = [i for i in non_adjacent if abs(get_coords(i)[0] - r) > 1 or abs(get_coords(i)[1] - c) > 1]
        direction_groups = {d: [] for d in ordinal_directions}
        for target in non_adjacent:
            direction = get_direction(space_id, target)
            if direction in ordinal_directions:
                direction_groups[direction].append(target)
        for direction in ordinal_directions:
            random.shuffle(direction_groups[direction])
            for target in direction_groups[direction]:
                if len(spaces[space_id]["connections"]) >= 4 or len(spaces[target]["connections"]) >= 4:
                    continue
                inverse_direction = get_direction(target, space_id)
                if inverse_direction:
                    target_non_adjacent = [c for c in spaces[target]["connections"] if abs(get_coords(c)[0] - get_coords(target)[0]) > 1 or abs(get_coords(c)[1] - get_coords(target)[1]) > 1]
                    if inverse_direction not in [get_direction(target, c) for c in target_non_adjacent]:
                        if random.random() < 0.05:
                            spaces[space_id]["connections"].append(target)
                            spaces[target]["connections"].append(space_id)
                            break  # Move to next quadrant
    
    # Phase 3: Cardinal adjacent connections for all spaces (50% chance)
    for space_id in range(25):
        if spaces[space_id]["type"] == "Crown":
            continue
        adjacent = get_adjacent_cardinal(space_id)
        random.shuffle(adjacent)
        for adj in adjacent:
            if len(spaces[space_id]["connections"]) >= 4 or len(spaces[adj]["connections"]) >= 4:
                continue
            if spaces[adj]["type"] == "Crown":
                continue
            if random.random() < 0.5 and adj not in spaces[space_id]["connections"]:
                spaces[space_id]["connections"].append(adj)
                if space_id not in spaces[adj]["connections"] and len(spaces[adj]["connections"]) < 4:
                    spaces[adj]["connections"].append(space_id)
    
    # Phase 4: Remove diagonal connections for non-outside spaces
    non_outside = [i for i in range(25) if i not in outside and spaces[i]["type"] != "Crown"]
    for space_id in non_outside:
        diagonal_adj = get_adjacent_diagonal(space_id)
        connections_to_remove = [(space_id, adj) for adj in diagonal_adj if adj in spaces[space_id]["connections"]]
        for source, target in connections_to_remove:
            if target in spaces[source]["connections"]:
                spaces[source]["connections"].remove(target)
            if source in spaces[target]["connections"]:
                spaces[target]["connections"].remove(source)
    
    # Phase 5: Crown connections - keep one bidirectional connection
    crown_id = next(i for i, s in enumerate(spaces) if s["type"] == "Crown")
    incoming = [i for i in range(25) if crown_id in spaces[i]["connections"]]
    if incoming:
        keep = random.choice(incoming)
        for space_id in range(25):
            if space_id != keep and crown_id in spaces[space_id]["connections"]:
                spaces[space_id]["connections"].remove(crown_id)
        spaces[crown_id]["connections"] = [keep]
        if crown_id not in spaces[keep]["connections"]:
            spaces[keep]["connections"].append(crown_id)
    
    # Ensure all spaces are connected and valid
    attempts = 0
    max_attempts = 200
    while not is_valid_grid(spaces, crown_id, start_space_id) and attempts < max_attempts:
        # Clear connections and retry
        for s in spaces:
            s["connections"] = []
        # Phase 1: Outside cardinal connections
        for space_id in outside:
            if spaces[space_id]["type"] == "Crown":
                continue
            adj_outside = get_adjacent_cardinal(space_id)
            for adj in adj_outside:
                if adj in outside and adj not in spaces[space_id]["connections"]:
                    spaces[space_id]["connections"].append(adj)
                    if space_id not in spaces[adj]["connections"]:
                        spaces[adj]["connections"].append(space_id)
        # Phase 2: Non-adjacent connections
        for space_id in range(25):
            if spaces[space_id]["type"] == "Crown":
                continue
            r, c = get_coords(space_id)
            non_adjacent = [i for i in range(25) if i != space_id and get_coords(i)[0] != r and get_coords(i)[1] != c]
            non_adjacent = [i for i in non_adjacent if abs(get_coords(i)[0] - r) > 1 or abs(get_coords(i)[1] - c) > 1]
            direction_groups = {d: [] for d in ordinal_directions}
            for target in non_adjacent:
                direction = get_direction(space_id, target)
                if direction in ordinal_directions:
                    direction_groups[direction].append(target)
            for direction in ordinal_directions:
                random.shuffle(direction_groups[direction])
                for target in direction_groups[direction]:
                    if len(spaces[space_id]["connections"]) >= 4 or len(spaces[target]["connections"]) >= 4:
                        continue
                    inverse_direction = get_direction(target, space_id)
                    if inverse_direction:
                        target_non_adjacent = [c for c in spaces[target]["connections"] if abs(get_coords(c)[0] - get_coords(target)[0]) > 1 or abs(get_coords(c)[1] - get_coords(target)[1]) > 1]
                        if inverse_direction not in [get_direction(target, c) for c in target_non_adjacent]:
                            if random.random() < 0.05:
                                spaces[space_id]["connections"].append(target)
                                spaces[target]["connections"].append(space_id)
                                break  # Move to next quadrant
        # Phase 3: Cardinal adjacent connections
        for space_id in range(25):
            if spaces[space_id]["type"] == "Crown":
                continue
            adjacent = get_adjacent_cardinal(space_id)
            random.shuffle(adjacent)
            for adj in adjacent:
                if len(spaces[space_id]["connections"]) >= 4 or len(spaces[adj]["connections"]) >= 4:
                    continue
                if spaces[adj]["type"] == "Crown":
                    continue
                if random.random() < 0.5 and adj not in spaces[space_id]["connections"]:
                    spaces[space_id]["connections"].append(adj)
                    if space_id not in spaces[adj]["connections"] and len(spaces[adj]["connections"]) < 4:
                        spaces[adj]["connections"].append(space_id)
        # Phase 4: Remove diagonal connections for non-outside
        non_outside = [i for i in range(25) if i not in outside and spaces[i]["type"] != "Crown"]
        for space_id in non_outside:
            diagonal_adj = get_adjacent_diagonal(space_id)
            connections_to_remove = [(space_id, adj) for adj in spaces[space_id]["connections"] if adj in diagonal_adj]
            for source, target in connections_to_remove:
                if target in spaces[source]["connections"]:
                    spaces[source]["connections"].remove(target)
                if source in spaces[target]["connections"]:
                    spaces[target]["connections"].remove(source)
        # Phase 5: Crown connections
        incoming = [i for i in range(25) if crown_id in spaces[i]["connections"]]
        if incoming:
            keep = random.choice(incoming)
            for space_id in range(25):
                if space_id != keep and crown_id in spaces[space_id]["connections"]:
                    spaces[space_id]["connections"].remove(crown_id)
            spaces[crown_id]["connections"] = [keep]
            if crown_id not in spaces[keep]["connections"]:
                spaces[keep]["connections"].append(crown_id)
        # Fallback: Connect unvisited spaces
        visited = set()
        queue = deque([start_space_id])
        visited.add(start_space_id)
        while queue:
            current = queue.popleft()
            for next_space in spaces[current]["connections"]:
                if next_space not in visited:
                    visited.add(next_space)
                    queue.append(next_space)
        unvisited = [i for i in range(25) if i not in visited and spaces[i]["type"] != "Crown"]
        for u in unvisited:
            possible_connectors = [i for i in range(25) if i != u and len(spaces[i]["connections"]) < 4 and spaces[i]["type"] != "Crown"]
            if possible_connectors:
                connector = random.choice(possible_connectors)
                r1, c1 = get_coords(connector)
                r2, c2 = get_coords(u)
                if r1 != r2 and c1 != c2 and connector not in spaces[u]["connections"]:
                    spaces[u]["connections"].append(connector)
                    if u not in spaces[connector]["connections"]:
                        spaces[connector]["connections"].append(u)
        attempts += 1
    
    if attempts >= max_attempts:
        raise Exception("Failed to generate valid grid after max attempts")
    
    return {"spaces": spaces}

if __name__ == "__main__":
    start_space_id = 12  # Default
    if len(sys.argv) > 1:
        try:
            start_space_id = int(sys.argv[1])
            if not (0 <= start_space_id < 25):
                raise ValueError("start_space_id must be between 0 and 24")
        except ValueError as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    
    grid = create_grid(start_space_id)
    print(json.dumps(grid, indent=2))