// socket.js - Socket.io communication and event handlers

const socket = io();

function getSocket() {
    return socket;
}

function initSocketListeners() {
    socket.on('assignPlayerId', ({ playerId }) => {
        console.log('Assigned playerId:', playerId);
        const state = getState();
        state.playerId = playerId;
        socket.emit('requestState', { roomId: state.roomId });
    });

    socket.on('state', updateState);
    
    socket.on('log', message => {
        const state = getState();
        state.log.push(message);
        updateLog();
    });
    
    socket.on('gameOver', (reason) => {
        const state = getState();
        state.gameOver = true;
        log(`Game Over: ${reason || 'Quest Concluded'}`);
        updateUI();
        showBoard();
    });
    
    socket.on('roomCreated', ({ roomId, memoryMode }) => {
        const state = getState();
        state.roomId = roomId;
        state.memoryMode = memoryMode;
        document.getElementById('room-id-display').innerHTML = `
            <p>Quest Scroll ID: ${roomId} (Share with others to join)</p>
            <button id="copy-room-id" class="fantasy-button copy-button">Copy Scroll ID</button>
            <button id="continue-game" class="fantasy-button">Continue to Quest</button>
        `;
        document.getElementById('room-id-display').style.display = 'block';
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('copy-room-id').addEventListener('click', copyRoomId);
        document.getElementById('continue-game').addEventListener('click', fetchGrid);
    });
    
    socket.on('initComplete', ({ turnOrder, currentPlayer }) => {
        console.log('initComplete received, turnOrder:', turnOrder, 'currentPlayer:', currentPlayer);
        const state = getState();
        state.initComplete = true;
        state.turnOrder = turnOrder;
        state.currentPlayer = currentPlayer;
        if (state.roomId && !getGrid() && state.players.some(p => p.id === state.playerId)) {
            fetchGrid();
        }
        updateUI();
    });
    
    socket.on('error', (message) => {
        console.error('Server error:', message);
        log(`Error: ${message}`);
        alert(`Server error: ${message}`);
    });
}

function updateState(newState) {
    const state = getState();
    console.log('Received state update, old currentPlayer:', state.currentPlayer, 'new state:', newState);

    const preservedPlayerId = state.playerId;

    if (newState.players) {
        newState.players = newState.players.map(newPlayer => {
            const existingPlayer = state.players.find(p => p.id === newPlayer.id);
            return existingPlayer ? { ...existingPlayer, ...newPlayer } : newPlayer;
        });
    }

    Object.assign(state, newState);
    state.playerId = preservedPlayerId;

    console.log('State updated, all players hasMoved:', state.players.map(p => `${p.name}: ${p.hasMoved}`));

    if (state.players.length === 3 && state.initComplete) {
        if (new Set(state.turnOrder).size !== state.players.length) {
            console.error('Invalid turnOrder received:', state.turnOrder);
            log('Error: Turn order corrupted. Please restart the game.');
            state.gameOver = true;
            socket.emit('gameOver', { roomId: state.roomId, reason: 'Turn order corrupted' });
            return;
        }
    }
    
    console.log('State updated, turnOrder:', state.turnOrder, 'currentPlayer:', state.currentPlayer, 'player positions:', state.players.map(p => `${p.name}: ${p.position}`));
    
    if (!state.players.some(p => p.id === state.playerId) && state.stateSyncRetries < getMaxStateSyncRetries()) {
        console.warn('updateState: Player ID not in state.players, requesting sync', { playerId: state.playerId, players: state.players });
        state.stateSyncRetries++;
        socket.emit('requestState', { roomId: state.roomId });
        setTimeout(updateUI, 500);
        return;
    }
    
    state.stateSyncRetries = 0;
    
    if (!getGrid() && state.roomId && state.players.some(p => p.id === state.playerId)) {
        console.warn('Grid not loaded, requesting grid');
        fetchGrid();
    }
    
    resetUIRetryCount();
    updateUI();
}