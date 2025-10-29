// utils.js - Utility functions

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getCoords(spaceId) {
    return [Math.floor(spaceId / 5), spaceId % 5];
}

function getDirection(fromId, toId) {
    const [r1, c1] = getCoords(fromId);
    const [r2, c2] = getCoords(toId);
    const dr = r2 - r1;
    const dc = c2 - c1;
    if (dr === -1 && dc === 0) return 'North';
    if (dr === 1 && dc === 0) return 'South';
    if (dr === 0 && dc === 1) return 'East';
    if (dr === 0 && dc === -1) return 'West';

    if (dr < 0 && dc < 0) return 'Northwest';
    if (dr < 0 && dc > 0) return 'Northeast';
    if (dr > 0 && dc < 0) return 'Southwest';
    if (dr > 0 && dc > 0) return 'Southeast';
    return null;
}

function bfsDistances(start, grid) {
    const distances = {};
    distances[start] = 0;
    const queue = [start];
    while (queue.length > 0) {
        const current = queue.shift();
        grid.spaces[current].connections.forEach(neighbor => {
            if (!(neighbor in distances)) {
                distances[neighbor] = distances[current] + 1;
                queue.push(neighbor);
            }
        });
    }
    return distances;
}

function log(message) {
    const state = getState();
    state.log.push(message);
    updateLog();
    getSocket().emit('log', message);
}

function updateLog() {
    const state = getState();
    const logContent = document.getElementById('log-content');
    if (logContent) {
        logContent.innerText = state.log.join('\n');
        logContent.scrollTop = logContent.scrollHeight;
    }
}

function sellItemsFor(amountNeeded, player) {
    while (player.gold < amountNeeded && player.items.length > 0) {
        const itemChoices = player.items.map((item, idx) => `${idx + 1}: ${item.name} (sells for ${Math.floor(item.cost / 2)} gold)`).join('\n');
        const choice = prompt(`You need ${amountNeeded - player.gold} more gold. Sell an item?\n${itemChoices}\nEnter number or cancel to skip.`);
        if (choice === null) break;
        const idx = parseInt(choice) - 1;
        if (idx >= 0 && idx < player.items.length) {
            const soldItem = player.items.splice(idx, 1)[0];
            const refund = Math.floor(soldItem.cost / 2);
            player.gold += refund;
            log(`${player.name} sold ${soldItem.name} for ${refund} gold.`);
        }
    }
}