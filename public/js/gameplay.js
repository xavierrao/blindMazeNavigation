// gameplay.js - Core gameplay mechanics

function makeMove(to) {
    const state = getState();
    if (state.currentPlayer !== state.playerId) {
        console.warn('makeMove: Not your turn, currentPlayer:', state.currentPlayer, 'playerId:', state.playerId);
        log('Error: Not your turn!');
        return;
    }
    const player = state.players.find(p => p.id === state.playerId);
    if (player.hasMoved) {
        log(`${player.name} cannot move: Already moved this turn.`);
        return;
    }
    const from = player.position;
    const grid = getGrid();
    player.position = to;
    const direction = getDirection(from, to);
    log(`${player.name} moved ${direction} and landed on a ${grid.spaces[to].type} space`);
    player.hasMoved = true;
    checkSpaceEffects();
    getSocket().emit('update', { roomId: state.roomId, state });
    updateUI();
}

function checkSpaceEffects() {
    const state = getState();
    const grid = getGrid();
    const player = state.players.find(p => p.id === state.playerId);
    const space = grid.spaces[player.position];

    const goldPile = state.goldPiles.find(g => g.space === player.position);
    if (goldPile) {
        player.gold += goldPile.amount;
        state.goldPiles = state.goldPiles.filter(g => g !== goldPile);
        log(`${player.name} claimed ${goldPile.amount} gold`);
    }

    const trap = state.traps.find(t => t.space === player.position && t.owner !== player.id);
    if (trap) {
        const owner = state.players.find(p => p.id === trap.owner);
        if (owner) {
            const amount = Math.min(player.gold, 2);
            sellItemsFor(amount - player.gold, player);
            if (player.gold >= amount) {
                player.gold -= amount;
                owner.gold += amount;
                log(`${player.name} triggered ${owner.name}'s trap, loses ${amount} gold`);
            } else if (player.items.some(i => i.name === 'Warding Talisman')) {
                player.items.splice(player.items.findIndex(i => i.name === 'Warding Talisman'), 1);
                log(`${player.name} repelled trap with Warding Talisman`);
            }
        }
        state.traps = state.traps.filter(t => t !== trap);
    }

    if (space.type === 'Start') {
        player.gold += 1;
        log(`${player.name} gained 1 gold from Start space`);
    } else if (space.type === 'Good') {
        showWheel('good', handleGoodWheelResult);
        getSocket().emit('update', { roomId: state.roomId, state });
        return;
    } else if (space.type === 'Bad') {
        showWheel('bad', handleBadWheelResult);
        getSocket().emit('update', { roomId: state.roomId, state });
        return;
    } else if (space.type === 'Combat') {
        showWheel('combat', handleCombatWheelResult);
        getSocket().emit('update', { roomId: state.roomId, state });
        return;
    } else if (space.type === 'Teleport') {
        const nonAdj = grid.spaces.filter(s => !space.connections.includes(s.id) && s.id !== player.position);
        if (nonAdj.length > 0) {
            const target = nonAdj[Math.floor(Math.random() * nonAdj.length)];
            player.position = target.id;
            log(`${player.name} teleported to ${target.type}`);
            player.hasMoved = true;
            checkSpaceEffects();
        }
    } else if (space.type === 'ShadowRealm') {
        player.shadowTurns = (player.shadowTurns || 0) + 1;
        log(`${player.name} entered Shadow Realm, must spin to exit`);
        getSocket().emit('update', { roomId: state.roomId, state });
        return;
    } else if (space.type === 'Crown') {
        if (player.gold >= 5) {
            player.gold -= 5;
            state.gameOver = true;
            log(`${player.name} reached the Crown (5 gold paid) - Quest Concluded!`);
            getSocket().emit('gameOver', { roomId: state.roomId, reason: 'Crown reached' });
        } else {
            log(`${player.name} reached the Crown but lacks 5 gold to claim it. Must earn more gold.`);
            player.hasMoved = true;
        }
    }

    getSocket().emit('update', { roomId: state.roomId, state });
}

function nextTurn() {
    const state = getState();
    const grid = getGrid();
    
    if (state.gameOver) {
        console.log('nextTurn: Game over, skipping turn advancement');
        return;
    }

    if (!state.initComplete || state.players.length !== 3) {
        console.warn('nextTurn: Game not initialized or insufficient players', { initComplete: state.initComplete, playersCount: state.players.length });
        return;
    }

    if (state.currentPlayer !== state.playerId) {
        console.warn('nextTurn: Not your turn, currentPlayer:', state.currentPlayer, 'playerId:', state.playerId);
        log('Error: Not your turn!');
        return;
    }

    const player = state.players.find(p => p.id === state.currentPlayer);
    if (!player) {
        console.error('Next player not found:', state.currentPlayer);
        log('Error: Next player not found. Game halted.');
        state.gameOver = true;
        getSocket().emit('gameOver', { roomId: state.roomId, reason: 'Next player not found' });
        return;
    }

    if (!player.hasMoved && grid.spaces[player.position].connections.length > 0 && grid.spaces[player.position].type !== 'ShadowRealm') {
        console.warn('nextTurn: Cannot end turn, player has not moved', { playerId: state.playerId, position: player.position });
        log(`${player.name} must move or spin before ending turn`);
        return;
    }

    console.log('nextTurn called, turnOrder:', state.turnOrder, 'currentPlayer:', state.currentPlayer, 'playerId:', state.playerId);

    let currentIdx = state.turnOrder.indexOf(state.currentPlayer);
    if (currentIdx === -1) {
        console.error('Current player not in turnOrder:', state.currentPlayer);
        log('Error: Current player not found. Defaulting to first player.');
        currentIdx = 0;
        state.currentPlayer = state.turnOrder[0];
    }

    if (currentIdx === state.turnOrder.length - 1) {
        state.round++;
        if (state.memoryMode) {
            state.log = [];
            log(`Round ${state.round} begins - Log cleared (Memory Mode).`);
        }
        state.currentPlayer = state.turnOrder[0];
    } else {
        state.currentPlayer = state.turnOrder[currentIdx + 1];
    }

    const nextPlayer = state.players.find(p => p.id === state.currentPlayer);
    if (!nextPlayer) {
        console.error('Next player not found:', state.currentPlayer);
        log('Error: Next player not found. Game halted.');
        state.gameOver = true;
        getSocket().emit('gameOver', { roomId: state.roomId, reason: 'Next player not found' });
        return;
    }

    console.log('Advancing to player:', nextPlayer.name, 'ID:', state.currentPlayer);

    state.players.forEach(p => {
        p.hasMoved = false;
    });
    console.log('nextTurn: Reset hasMoved for all players:', state.players.map(p => `${p.name}: ${p.hasMoved}`));

    if (!grid || !grid.spaces) {
        console.error('nextTurn: Grid not loaded, requesting grid');
        log('Error: Game grid not loaded. Please restart the game.');
        fetchGrid();
        return;
    }

    if (grid.spaces[nextPlayer.position].type === 'ShadowRealm') {
        nextPlayer.shadowTurns = (nextPlayer.shadowTurns || 0) + 1;
        log(`${nextPlayer.name}'s turn: In Shadow Realm (Turn ${nextPlayer.shadowTurns}), must spin to exit`);
    } else {
        const directions = grid.spaces[nextPlayer.position].connections
            .map(to => getDirection(nextPlayer.position, to))
            .filter(dir => dir !== null);
        if (directions.length > 0) {
            log(`${nextPlayer.name}'s turn: Can move ${directions.join(', ')}`);
        } else {
            log(`${nextPlayer.name}'s turn: No valid moves available`);
        }
    }

    state.goblins = state.goblins.filter(g => g.moves < 5);
    state.goblins.forEach(g => {
        const space = grid.spaces[g.space];
        if (space.connections.length > 0) {
            g.space = space.connections[Math.floor(Math.random() * space.connections.length)];
            g.moves++;
            const victims = state.players.filter(p => p.position === g.space && p.id !== g.owner);
            if (victims.length > 0) {
                const victim = victims[0];
                const amount = Math.min(victim.gold, 1);
                sellItemsFor(amount - victim.gold, victim);
                if (victim.gold >= amount) {
                    victim.gold -= amount;
                    const owner = state.players.find(p => p.id === g.owner);
                    owner.gold += amount;
                    log(`Goblin (${owner.name}) stole 1 gold from ${victim.name}`);
                    g.moves = 5;
                }
            }
        }
    });
    state.goblins = state.goblins.filter(g => g.moves < 5);

    state.shopAccess = false;

    const shadowRealmId = grid.spaces.find(s => s.type === 'ShadowRealm')?.id;
    if (shadowRealmId && state.players.every(p => p.position === shadowRealmId)) {
        log('All players are in the Shadow Realm! Emergency escape sequence initiated...');
        handleAllInShadowRealm();
    }

    console.log('nextTurn: Emitting state update', {
        newCurrentPlayer: state.currentPlayer,
        newCurrentPlayerName: nextPlayer.name,
        turnOrder: state.turnOrder,
        allPlayersHasMoved: state.players.map(p => `${p.name}: ${p.hasMoved}`)
    });
    getSocket().emit('update', { roomId: state.roomId, state });

    setTimeout(() => {
        console.log('nextTurn: Requesting fresh state after delay');
        getSocket().emit('requestState', { roomId: state.roomId });
        updateUI();
    }, 150);
}

function handleAllInShadowRealm() {
    const state = getState();
    const grid = getGrid();
    const shadowRealmId = grid.spaces.find(s => s.type === 'ShadowRealm').id;

    const attemptEscape = () => {
        let anyoneEscaped = false;

        state.players.forEach(player => {
            if (player.position !== shadowRealmId) return;

            const escapeChance = Math.random() < 0.5;
            if (escapeChance) {
                const connections = grid.spaces[shadowRealmId].connections;
                player.position = connections[Math.floor(Math.random() * connections.length)];
                player.shadowTurns = 0;
                log(`${player.name} escaped Shadow Realm via emergency escape to ${grid.spaces[player.position].type}!`);
                anyoneEscaped = true;
            } else {
                log(`${player.name} failed to escape Shadow Realm`);
            }
        });

        if (!anyoneEscaped && state.players.every(p => p.position === shadowRealmId)) {
            log('No one escaped! Trying again...');
            setTimeout(() => attemptEscape(), 2000);
        } else {
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        }
    };

    attemptEscape();
}

function showBoard() {
    const state = getState();
    if (!state.gameOver || !state.initComplete) {
        console.warn('showBoard: Skipped, game not over or not initialized', { gameOver: state.gameOver, initComplete: state.initComplete });
        return;
    }

    const svg = document.getElementById('board');
    svg.style.display = 'none';
    svg.innerHTML = '';

    let boardContainer = document.getElementById('board-image-container');
    if (!boardContainer) {
        boardContainer = document.createElement('div');
        boardContainer.id = 'board-image-container';
        boardContainer.style.display = 'flex';
        boardContainer.style.justifyContent = 'center';
        boardContainer.style.margin = '20px 0';
        svg.parentNode.insertBefore(boardContainer, svg);
    }

    boardContainer.innerHTML = '<p>Generating map...</p>';

    fetch(`/api/map-image?roomId=${encodeURIComponent(state.roomId)}`)
        .then(res => res.json())
        .then(data => {
            const img = document.createElement('img');
            img.src = data.image;
            img.style.maxWidth = '600px';
            img.style.borderRadius = '10px';
            img.style.border = '2px solid #d4a017';
            boardContainer.innerHTML = '';
            boardContainer.appendChild(img);
        })
        .catch(err => {
            console.error('Error loading map image:', err);
            boardContainer.innerHTML = '<p>Error loading map image</p>';
        });
}