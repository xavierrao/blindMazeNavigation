// room.js - Room management and grid fetching

async function fetchGrid() {
    const state = getState();

    // If we have a roomId but no playerId, try to rejoin
    if (state.roomId && !state.playerId) {
        const playerName = getPlayerName();
        if (playerName) {
            console.log('Attempting to rejoin room:', state.roomId);
            getSocket().emit('join', { roomId: state.roomId, name: playerName }, response => {
                if (response.error) {
                    alert(`Error rejoining room: ${response.error}`);
                    window.location.href = '/lobby';
                    return;
                }
                state.playerId = response.playerId;
                localStorage.setItem('playerId', response.playerId);
                fetchGrid(); // Try again with playerId
            });
            return;
        }
    }

    if (!state.playerId || !state.roomId || !state.players.some(p => p.id === state.playerId)) {
        console.warn('fetchGrid: Skipping - playerId or state not ready', { playerId: state.playerId, roomId: state.roomId, playerInState: state.players.some(p => p.id === state.playerId) });
        if (state.stateSyncRetries < getMaxStateSyncRetries()) {
            state.stateSyncRetries++;
            console.log(`fetchGrid: Retrying state sync (${state.stateSyncRetries}/${getMaxStateSyncRetries()})`);
            getSocket().emit('requestState', { roomId: state.roomId });
            setTimeout(fetchGrid, 500);
        } else {
            console.error('fetchGrid: Max state sync retries reached');
            log('Error: Failed to sync player state. Please refresh and try again.');
            alert('Error: Failed to sync player state. Please refresh and try again.');
        }
        return;
    }
    const timeout = 5000;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(`/api/grid?roomId=${encodeURIComponent(state.roomId)}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Failed to fetch grid');
        }
        const newGrid = await res.json();
        if (newGrid.error) {
            throw new Error(newGrid.error);
        }
        const newGridHash = JSON.stringify(newGrid.spaces.map(s => ({ id: s.id, type: s.type, connections: s.connections.sort() })));

        const existingGrid = getGrid();
        if (existingGrid && state.gridHash && state.gridHash !== newGridHash) {
            console.warn('Grid mismatch detected, replacing with new grid');
            log('Warning: Grid inconsistency detected. Syncing with server grid.');
        }

        setGrid(newGrid);
        state.gridHash = newGridHash;
        console.log('Grid loaded, hash:', state.gridHash);
        getSocket().emit('init', state.roomId);

        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('loading-indicator').classList.remove('active-page');
        document.getElementById('game').style.display = 'flex';
        document.getElementById('game').classList.add('active-page');

        getSocket().emit('requestState', { roomId: state.roomId });
        updateUI();
    } catch (e) {
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('loading-indicator').classList.remove('active-page');
        alert(`Error loading grid: ${e.message}. Ensure Python 3 is installed, grid_generator.py is in public/, and the server is running correctly.`);
        console.error('Grid fetch error:', e.message);
        window.location.href = '/lobby';
    }
}