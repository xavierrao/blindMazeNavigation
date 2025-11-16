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

    socket.on('minigameStateUpdate', (gameState) => {
        console.log('Received mini-game state update:', gameState.type, 'hasEnded:', gameState.gameData?.hasEnded, 'endScreenShown:', miniGameState.endScreenShown);

        // Update local mini-game state
        Object.assign(miniGameState, gameState);

        // Check if any mini-game just ended
        if (gameState.gameData && gameState.gameData.hasEnded && miniGameState.active && !miniGameState.endScreenShown) {
            console.log('Showing end screen for', gameState.type);
            miniGameState.endScreenShown = true;

            // Show appropriate end screen based on game type
            if (gameState.type === 'tictactoe') {
                endTicTacToe();
            } else if (gameState.type === 'reversi') {
                endReversi();
            } else if (gameState.type === 'coinclash') {
                endCoinClash();
            }
            return;
        }

        // Refresh the mini-game UI if active and not ended
        if (miniGameState.active && !gameState.gameData?.hasEnded) {
            if (miniGameState.type === 'tictactoe') {
                showTicTacToeModal();
            } else if (miniGameState.type === 'reversi') {
                showReversiModal();
            } else if (miniGameState.type === 'coinclash') {
                showCoinClashModal();
            }
        }
    });

    socket.on('minigameStart', ({ combatResult, gameType }) => {
        console.log('Mini-game starting for all players, type:', gameType, 'combat result:', combatResult);

        const state = getState();
        const playerIds = state.players.map(p => p.id);

        // Start the specific mini-game
        const onComplete = (winnerId) => {
            const winner = state.players.find(p => p.id === winnerId);
            const grid = getGrid();

            // Award based on combat wheel result
            if (combatResult === 'Steal') {
                state.players.forEach(p => {
                    if (p.id !== winnerId && p.gold > 0) {
                        const stolen = Math.min(2, p.gold);
                        p.gold -= stolen;
                        winner.gold += stolen;
                    }
                });
                log(`Combat: ${winner.name} won the mini-game and stole 2 gold from each opponent!`);
            } else if (combatResult === 'Shadow') {
                const shadowRealm = grid.spaces.find(s => s.type === 'ShadowRealm');
                state.players.forEach(p => {
                    if (p.id !== winnerId && shadowRealm) {
                        p.position = shadowRealm.id;
                        p.shadowTurns = (p.shadowTurns || 0) + 1;
                    }
                });
                log(`Combat: ${winner.name} won the mini-game! Other players sent to Shadow Realm.`);
            } else if (combatResult === 'Truce') {
                winner.gold += 3;
                state.players.forEach(p => {
                    if (p.id !== winnerId) {
                        p.gold += 1;
                    }
                });
                log(`Combat: ${winner.name} won the mini-game and gained 3 gold! Others gained 1 gold.`);
            } else {
                winner.gold += 2;
                log(`Combat: ${winner.name} won the mini-game and gained 2 gold.`);
            }

            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        };

        // Launch the specified mini-game
        if (gameType === 'tictactoe') {
            initTicTacToe(playerIds, onComplete);
        } else if (gameType === 'reversi') {
            initReversi(playerIds, onComplete);
        } else if (gameType === 'coinclash') {
            initCoinClash(playerIds, onComplete);
        }
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