// items.js - Item effects and shop management

function scoutLens(player) {
    const grid = getGrid();
    const adjacent = grid.spaces[player.position].connections;
    const spacesInfo = adjacent.map(id => `${getDirection(player.position, id)}: ${grid.spaces[id].type}`).join(', ');
    log(`${player.name} used Scout Lens: Adjacent spaces are ${spacesInfo || 'none'}`);
}

function chaosSwap(player) {
    const state = getState();
    const grid = getGrid();
    const validPlayers = state.players.filter(p => grid.spaces[p.position].type !== 'ShadowRealm');
    if (validPlayers.length < 2) {
        log(`${player.name} used Chaos Swap: Not enough valid players to swap`);
        return;
    }

    const shuffled = shuffle([...validPlayers]);
    const player1 = shuffled[0];
    const player2 = shuffled[1];

    const temp = player1.position;
    player1.position = player2.position;
    player2.position = temp;

    log(`${player.name} used Chaos Swap: Swapped positions of ${player1.name} and ${player2.name}`);
    checkSpaceEffects();
}

function crownCompass(player) {
    const grid = getGrid();
    const crownId = grid.spaces.find(s => s.type === 'Crown').id;
    const distances = bfsDistances(crownId, grid);
    const currentDist = distances[player.position];
    const closerDirections = [];
    grid.spaces[player.position].connections.forEach(conn => {
        if (distances[conn] < currentDist) {
            const dir = getDirection(player.position, conn);
            if (dir) closerDirections.push(dir);
        }
    });
    if (closerDirections.length > 0) {
        log(`${player.name} used Crown Compass: Move ${closerDirections.join(' or ')} to get closer.`);
    } else {
        log(`${player.name} used Crown Compass: No closer paths found.`);
    }
}

function thiefsSnare(player) {
    const state = getState();
    state.traps.push({ space: player.position, owner: player.id });
    log(`${player.name} used Thief's Snare: Trap set at current space`);
}

function bountyDrop(player) {
    const state = getState();
    const grid = getGrid();
    const adjacent = grid.spaces[player.position].connections;
    if (adjacent.length > 0) {
        const target = adjacent[Math.floor(Math.random() * adjacent.length)];
        state.goldPiles.push({ space: target, amount: 3 });
        log(`${player.name} used Bounty Drop: 3 gold placed at adjacent ${getDirection(player.position, target)}`);
    } else {
        log(`${player.name} used Bounty Drop: No adjacent spaces available`);
    }
}

function misfortuneCurse(player) {
    const state = getState();
    const others = state.players.filter(p => p.id !== player.id);
    if (others.length > 0) {
        const target = others[Math.floor(Math.random() * others.length)];
        const amount = Math.min(target.gold, 2);
        sellItemsFor(amount - target.gold, target);
        if (target.gold >= amount) {
            target.gold -= amount;
            log(`${player.name} used Misfortune Curse: ${target.name} loses ${amount} gold`);
        } else {
            log(`${player.name} used Misfortune Curse: ${target.name} has no gold to lose`);
        }
    } else {
        log(`${player.name} used Misfortune Curse: No other players available`);
    }
}

function closeQuartersHeist(player) {
    const state = getState();
    const occupants = state.players.filter(p => p.position === player.position && p.id !== player.id);
    if (occupants.length > 0) {
        const target = occupants[Math.floor(Math.random() * occupants.length)];
        const amount = Math.min(target.gold, 4);
        sellItemsFor(amount - target.gold, target);
        if (target.gold >= amount) {
            target.gold -= amount;
            player.gold += amount;
            log(`${player.name} used Close-Quarters Heist: Stole 4 gold from ${target.name}`);
        } else {
            log(`${player.name} used Close-Quarters Heist: ${target.name} has no gold`);
        }
    } else {
        log(`${player.name} used Close-Quarters Heist: No other players on space`);
    }
}

function wanderingGoblin(player) {
    const state = getState();
    state.goblins.push({ space: player.position, owner: player.id, moves: 0 });
    log(`${player.name} used Wandering Goblin: Goblin summoned at current space`);
}

function wardingTalisman(player) {
    log(`${player.name} used Warding Talisman: Protected from next trap`);
}

// Initialize item effects in shopItems
function initializeItemEffects() {
    shopItems[0].effect = scoutLens;
    shopItems[1].effect = chaosSwap;
    shopItems[2].effect = crownCompass;
    shopItems[3].effect = thiefsSnare;
    shopItems[4].effect = bountyDrop;
    shopItems[5].effect = misfortuneCurse;
    shopItems[6].effect = closeQuartersHeist;
    shopItems[7].effect = wanderingGoblin;
    shopItems[8].effect = wardingTalisman;
}

function buyItem(itemName) {
    const state = getState();
    const grid = getGrid();
    const player = state.players.find(p => p.id === state.playerId);
    const item = shopItems.find(i => i.name === itemName);
    if (!item) {
        log(`${player.name} tried to buy invalid item: ${itemName}`);
        return;
    }
    const isOnShop = grid.spaces[player.position].type === 'Shop';
    if (!isOnShop && !state.shopAccess) {
        log(`${player.name} cannot access shop: Not on Shop space or granted access.`);
        return;
    }
    const itemCount = player.items.filter(i => i.name === itemName).length;
    if (item.max !== Infinity && itemCount >= item.max) {
        log(`${player.name} cannot buy ${itemName}: Max ${item.max} reached.`);
        return;
    }
    if (player.gold < item.cost) {
        sellItemsFor(item.cost - player.gold, player);
        if (player.gold < item.cost) {
            log(`${player.name} cannot afford ${itemName} (${item.cost} gold needed).`);
            return;
        }
    }
    player.gold -= item.cost;
    player.items.push(item);
    log(`${player.name} bought ${itemName} for ${item.cost} gold.`);
    getSocket().emit('update', { roomId: state.roomId, state });
    updateUI();
}

function useItem(idx) {
    const state = getState();
    const player = state.players.find(p => p.id === state.playerId);
    if (state.currentPlayer !== state.playerId) {
        log('Error: Not your turn!');
        return;
    }
    const itemData = player.items[idx];
    if (!itemData) {
        log('Error: Invalid item.');
        return;
    }

    const itemDef = shopItems.find(i => i.name === itemData.name);
    if (!itemDef || !itemDef.effect) {
        log('Error: Item effect not found.');
        return;
    }

    itemDef.effect(player);
    player.items.splice(idx, 1);
    log(`${player.name} used ${itemData.name}`);
    getSocket().emit('update', { roomId: state.roomId, state });
    updateUI();
}