// ui.js - UI update logic

function updateUI() {
    const state = getState();
    const grid = getGrid();
    
    if (!state.playerId || !state.players.some(p => p.id === state.playerId)) {
        console.warn('updateUI: Skipping - playerId not in state.players', { playerId: state.playerId, players: state.players });
        if (state.stateSyncRetries < getMaxStateSyncRetries()) {
            state.stateSyncRetries++;
            console.log(`updateUI: Retrying state sync (${state.stateSyncRetries}/${getMaxStateSyncRetries()})`);
            getSocket().emit('requestState', { roomId: state.roomId });
            setTimeout(updateUI, 500);
        } else {
            console.error('updateUI: Max state sync retries reached');
            log('Error: Failed to sync player state. Please refresh and try again.');
            alert('Error: Failed to sync player state. Please refresh and try again.');
        }
        return;
    }

    const player = state.players.find(p => p.id === state.playerId);
    const isCurrentPlayer = state.currentPlayer === state.playerId;
    console.log('updateUI: Rendering for playerId:', state.playerId, 'isCurrentPlayer:', isCurrentPlayer, 'currentPlayer:', state.currentPlayer, 'hasMoved:', player?.hasMoved, 'player.id check:', player?.id);

    if (!state.initComplete || !player || !grid || !grid.spaces || !grid.spaces[player.position]) {
        console.warn('updateUI: Skipping - game not fully initialized', {
            initComplete: state.initComplete,
            player: !!player,
            grid: !!grid,
            spaces: grid ? !!grid.spaces : false,
            positionValid: grid && grid.spaces && player ? !!grid.spaces[player.position] : false,
            playersCount: state.players.length
        });
        const logContent = document.getElementById('log-content');
        if (logContent) {
            logContent.innerText = state.initComplete
                ? state.log.join('\n')
                : `Waiting for all players to join (${state.players.length}/3)...\n` + state.log.join('\n');
            logContent.scrollTop = logContent.scrollHeight;
        }
        if (state.roomId && !grid && state.players.some(p => p.id === state.playerId)) {
            console.warn('Grid not loaded in updateUI, requesting grid');
            fetchGrid();
        }
        const endTurnDiv = document.getElementById('end-turn');
        if (endTurnDiv) {
            endTurnDiv.innerHTML = '';
        }
        return;
    }

    const isOnShop = grid.spaces[player.position].type === 'Shop';
    const canAccessShop = isOnShop || state.shopAccess;

    updatePlayerInfoBar();
    updateMoveOptions(player, isCurrentPlayer);
    updateInventory(player, isCurrentPlayer);
    updateEndTurnButton(player, isCurrentPlayer);
    updateShop(player, isCurrentPlayer, canAccessShop);
    updateLog();

    checkUIRetry(isCurrentPlayer, player);
}

function updatePlayerInfoBar() {
    const state = getState();
    const grid = getGrid();
    const playerInfoBar = document.getElementById('player-info-bar');
    playerInfoBar.style.display = 'flex';
    playerInfoBar.innerHTML = '';
    state.players.forEach(p => {
        const positionType = grid && grid.spaces && grid.spaces[p.position] ? grid.spaces[p.position].type : 'Unknown';
        const card = document.createElement('div');
        card.className = 'player-card';
        if (p.id === state.currentPlayer) {
            card.classList.add('current-player');
        }
        card.innerHTML = `
        <strong>${p.name}</strong><br>
        Gold: ${p.gold}<br>
        Items: ${p.items.length}<br>
        Position: ${positionType}
    `;
        playerInfoBar.appendChild(card);
    });
}

function updateMoveOptions(player, isCurrentPlayer) {
    const state = getState();
    const grid = getGrid();
    const moveOptions = document.getElementById('move-options');
    if (!moveOptions) {
        console.error('updateUI: #move-options not found in DOM');
        log('Error: UI element not found. Please check index.html.');
        return;
    }
    moveOptions.innerHTML = '';
    moveOptions.style.display = 'none';

    console.log('updateUI: Move button logic check:', {
        isCurrentPlayer,
        gameOver: state.gameOver,
        hasMoved: player.hasMoved,
        spaceType: grid.spaces[player.position].type,
        shouldShowButtons: isCurrentPlayer && !state.gameOver && !player.hasMoved
    });

    if (isCurrentPlayer && !state.gameOver && !player.hasMoved) {
        if (grid.spaces[player.position].type === 'ShadowRealm') {
            showWheel('shadow', handleShadowWheelResult);
            moveOptions.style.display = 'none';
        } else {
            const directions = [
                { name: 'Northwest', dr: -1, dc: -1 },
                { name: 'North', dr: -1, dc: 0 },
                { name: 'Northeast', dr: -1, dc: 1 },
                { name: 'West', dr: 0, dc: -1 },
                { name: 'Center', dr: null, dc: null },
                { name: 'East', dr: 0, dc: 1 },
                { name: 'Southwest', dr: 1, dc: -1 },
                { name: 'South', dr: 1, dc: 0 },
                { name: 'Southeast', dr: 1, dc: 1 }
            ];

            const connections = grid.spaces[player.position].connections;
            const [r, c] = getCoords(player.position);

            directions.forEach((dir) => {
                if (dir.name === 'Center') {
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'move-button center-empty';
                    moveOptions.appendChild(emptyDiv);
                } else {
                    let targetId = null;
                    for (const conn of connections) {
                        const [connR, connC] = getCoords(conn);
                        const dr = connR - r;
                        const dc = connC - c;

                        if (dir.dr === 0 && dir.dc !== 0) {
                            if (dr === 0 && Math.sign(dc) === Math.sign(dir.dc)) {
                                targetId = conn;
                                break;
                            }
                        } else if (dir.dc === 0 && dir.dr !== 0) {
                            if (dc === 0 && Math.sign(dr) === Math.sign(dir.dr)) {
                                targetId = conn;
                                break;
                            }
                        } else {
                            if (dr !== 0 && dc !== 0 &&
                                Math.sign(dr) === Math.sign(dir.dr) &&
                                Math.sign(dc) === Math.sign(dir.dc)) {
                                targetId = conn;
                                break;
                            }
                        }
                    }

                    const isValid = targetId !== null;

                    const button = document.createElement('button');
                    button.className = `fantasy-button move-button ${isValid ? '' : 'disabled'}`;
                    button.innerText = dir.name;
                    button.disabled = !isValid;

                    if (isValid) {
                        button.onclick = () => makeMove(targetId);
                    }

                    moveOptions.appendChild(button);
                }
            });

            moveOptions.style.display = 'grid';
            console.log('updateUI: Added directional movement grid');
        }
    } else {
        console.log('updateUI: No move buttons added', { isCurrentPlayer, gameOver: state.gameOver, currentPlayer: state.currentPlayer, playerId: state.playerId, hasMoved: player.hasMoved });
    }
}

function updateInventory(player, isCurrentPlayer) {
    const state = getState();
    const inventoryDiv = document.getElementById('inventory');
    if (!inventoryDiv) {
        console.error('updateUI: #inventory not found in DOM');
        log('Error: Inventory element not found. Please check index.html.');
        return;
    }
    inventoryDiv.innerHTML = '';
    if (isCurrentPlayer && !state.gameOver && player.items.length > 0) {
        player.items.forEach((item, idx) => {
            const container = document.createElement('div');
            container.className = 'item-container';

            const button = document.createElement('button');
            button.className = 'fantasy-button inventory-item-button';

            const img = document.createElement('img');
            img.src = item.sprite;
            img.alt = item.name;
            img.className = 'item-sprite';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'item-name';
            nameDiv.innerText = item.name;

            const useDiv = document.createElement('div');
            useDiv.className = 'item-info';
            useDiv.innerText = 'Click to use';

            button.appendChild(img);
            button.appendChild(nameDiv);
            button.appendChild(useDiv);
            button.onclick = () => useItem(idx);

            const tooltip = document.createElement('div');
            tooltip.className = 'item-tooltip';
            tooltip.innerText = item.description;

            container.appendChild(button);
            container.appendChild(tooltip);
            inventoryDiv.appendChild(container);
        });
    }
}

function updateEndTurnButton(player, isCurrentPlayer) {
    const state = getState();
    const grid = getGrid();
    const endTurnDiv = document.getElementById('end-turn');
    if (!endTurnDiv) {
        console.error('updateUI: #end-turn not found in DOM');
        log('Error: End Turn element not found. Please check index.html.');
        return;
    }
    endTurnDiv.innerHTML = '';
    console.log('updateUI: End Turn button logic check:', {
        isCurrentPlayer,
        gameOver: state.gameOver,
        hasMoved: player.hasMoved,
        connectionsLength: grid.spaces[player.position].connections.length,
        shouldShowEndTurn: isCurrentPlayer && !state.gameOver && (player.hasMoved || grid.spaces[player.position].connections.length === 0)
    });

    if (isCurrentPlayer && !state.gameOver && (player.hasMoved || grid.spaces[player.position].connections.length === 0)) {
        console.log('updateUI: Adding End Turn button for playerId:', state.playerId, 'hasMoved:', player.hasMoved, 'connections:', grid.spaces[player.position].connections.length);
        document.getElementById("end-turn").style.display = 'flex';
        const button = document.createElement('button');
        button.className = 'fantasy-button';
        button.innerText = 'End Turn';
        button.onclick = () => nextTurn();
        endTurnDiv.appendChild(button);
    } else {
        document.getElementById("end-turn").style.display = 'none';
        console.log('updateUI: Not adding End Turn button', { isCurrentPlayer, gameOver: state.gameOver, currentPlayer: state.currentPlayer, playerId: state.playerId, hasMoved: player.hasMoved, connections: grid.spaces[player.position].connections.length });
    }
}

function updateShop(player, isCurrentPlayer, canAccessShop) {
    const state = getState();
    const shopDiv = document.getElementById('shop-items');
    if (shopDiv) {
        shopDiv.innerHTML = '';
        if (isCurrentPlayer && canAccessShop && !state.gameOver) {
            shopItems.forEach(item => {
                const itemCount = player.items.filter(i => i.name === item.name).length;

                const container = document.createElement('div');
                container.className = 'item-container';

                const button = document.createElement('button');
                button.className = 'fantasy-button shop-item-button';

                const img = document.createElement('img');
                img.src = item.sprite;
                img.alt = item.name;
                img.className = 'item-sprite';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'item-name';
                nameDiv.innerText = item.name;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'item-info';
                infoDiv.innerText = `${item.cost} gold, ${item.max === Infinity ? '∞' : item.max - itemCount} left`;

                button.appendChild(img);
                button.appendChild(nameDiv);
                button.appendChild(infoDiv);
                button.disabled = player.gold < item.cost || (item.max !== Infinity && itemCount >= item.max);
                button.onclick = () => buyItem(item.name);

                const tooltip = document.createElement('div');
                tooltip.className = 'item-tooltip';
                tooltip.innerText = item.description;

                container.appendChild(button);
                container.appendChild(tooltip);
                shopDiv.appendChild(container);
            });
        } else {
            shopDiv.innerText = '';
        }
    } else {
        console.error('updateUI: #shop-items not found in DOM');
    }
}

function checkUIRetry(isCurrentPlayer, player) {
    const state = getState();
    const moveOptions = document.getElementById('move-options');
    if (isCurrentPlayer && !state.gameOver && !player.hasMoved && moveOptions.innerHTML === '' && getUIRetryCount() < getMaxUIRetries()) {
        console.warn(`updateUI: isCurrentPlayer true but no buttons, retrying in 500ms (attempt ${getUIRetryCount() + 1}/${getMaxUIRetries()})`);
        incrementUIRetryCount();
        getSocket().emit('requestState', { roomId: state.roomId });
        setTimeout(updateUI, 500);
    } else {
        resetUIRetryCount();
    }
}