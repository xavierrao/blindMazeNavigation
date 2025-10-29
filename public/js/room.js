// room.js - Room creation and joining

function createGame() {
    document.getElementById('room-id').value = '';
    document.getElementById('room-id-display').style.display = 'none';
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('loading-indicator').classList.add('active-page');
    document.getElementById('room-container').style.display = 'flex';
    document.getElementById('room-container').classList.add('active-page');
    document.getElementById('room-selection').style.display = 'block';
    const memoryMode = document.getElementById('memory-toggle-create').checked;
    const randomStartSpace = document.getElementById('random-start-toggle-create').checked;
    getSocket().emit('create', { memoryMode, randomStartSpace, name: getPlayerName() }, response => {
        if (response.error) {
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('loading-indicator').classList.remove('active-page');
            document.getElementById('room-container').style.display = 'flex';
            document.getElementById('room-container').classList.add('active-page');
            document.getElementById('room-selection').style.display = 'block';
            alert(`Error creating room: ${response.error}`);
            return;
        }
        const state = getState();
        state.playerId = response.playerId;
    });
}

function joinRoom() {
    const roomId = document.getElementById('room-id').value || 'default';
    const state = getState();
    state.roomId = roomId;
    document.getElementById('loading-indicator').style.display = 'block';
    document.getElementById('loading-indicator').classList.add('active-page');
    document.getElementById('room-id-display').style.display = 'none';
    document.getElementById('room-container').style.display = 'flex';
    document.getElementById('room-container').classList.add('active-page');
    document.getElementById('room-selection').style.display = 'block';
    getSocket().emit('join', { roomId, name: getPlayerName() }, response => {
        if (response.error) {
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('loading-indicator').classList.remove('active-page');
            document.getElementById('room-container').style.display = 'flex';
            document.getElementById('room-container').classList.add('active-page');
            document.getElementById('room-selection').style.display = 'block';
            alert(response.error);
            return;
        }
        state.playerId = response.playerId;
        state.memoryMode = response.memoryMode;
        document.getElementById('room-id-display').innerHTML = `
            <p>Joined Quest: ${roomId}</p>
            <button id="continue-game" class="fantasy-button">Continue to Quest</button>
        `;
        document.getElementById('room-id-display').style.display = 'block';
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('loading-indicator').classList.remove('active-page');
        document.getElementById('continue-game').addEventListener('click', fetchGrid);
    });
}

function copyRoomId() {
    const state = getState();
    const roomId = state.roomId;
    navigator.clipboard.writeText(roomId).then(() => {
        document.getElementById('copy-room-id').innerText = 'Copied!';
        setTimeout(() => document.getElementById('copy-room-id').innerText = 'Copy Scroll ID', 2000);
    }).catch(err => {
        document.getElementById('copy-room-id').innerText = 'Failed - Copy Manually';
        setTimeout(() => document.getElementById('copy-room-id').innerText = 'Copy Scroll ID', 2000);
        console.error('Clipboard fallback:', err);
        const textElement = document.querySelector('#room-id-display p');
        const range = document.createRange();
        range.selectNodeContents(textElement);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    });
}

async function fetchGrid() {
    const state = getState();
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
        document.getElementById('room-container').style.display = 'none';
        document.getElementById('room-container').classList.remove('active-page');
        document.getElementById('room-selection').style.display = 'none';
        document.getElementById('room-id-display').style.display = 'none';
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('loading-indicator').classList.remove('active-page');
        document.getElementById('game').style.display = 'flex';
        document.getElementById('game').classList.add('active-page');
        getSocket().emit('requestState', { roomId: state.roomId });
        updateUI();
    } catch (e) {
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('loading-indicator').classList.remove('active-page');
        document.getElementById('room-container').style.display = 'flex';
        document.getElementById('room-container').classList.add('active-page');
        document.getElementById('room-selection').style.display = 'block';
        document.getElementById('room-id-display').style.display = 'none';
        alert(`Error loading grid: ${e.message}. Ensure Python 3 is installed, grid_generator.py is in public/, and the server is running correctly.`);
        console.error('Grid fetch error:', e.message);
    }
}