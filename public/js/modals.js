// modals.js - Modal window management

function showPlayerSelectionModal(action, callback, customPlayers = null) {
    const state = getState();
    const player = state.players.find(p => p.id === state.playerId);
    const otherPlayers = customPlayers || state.players.filter(p => p.id !== player.id);

    const modal = document.getElementById('player-selection-modal');
    const container = document.getElementById('player-selection-container');
    const title = document.getElementById('player-selection-title');

    title.innerText = action;
    container.innerHTML = '';

    otherPlayers.forEach(p => {
        const button = document.createElement('button');
        button.className = 'fantasy-button';
        button.innerText = `${p.name} (${p.gold} gold, ${p.items.length} items)`;
        button.onclick = () => {
            modal.style.display = 'none';
            callback(p);
        };
        container.appendChild(button);
    });

    modal.style.display = 'flex';
}

function showItemSelectionModal(action, callback) {
    const state = getState();
    const player = state.players.find(p => p.id === state.playerId);

    const modal = document.getElementById('item-selection-modal');
    const container = document.getElementById('item-selection-container');
    const title = document.getElementById('item-selection-title');

    title.innerText = action;
    container.innerHTML = '';

    player.items.forEach((item, idx) => {
        const button = document.createElement('button');
        button.className = 'fantasy-button';
        button.innerText = item.name;
        button.onclick = () => {
            modal.style.display = 'none';
            callback(idx);
        };
        container.appendChild(button);
    });

    modal.style.display = 'flex';
}