// gameMain.js - Main game initialization for game page

function initGame() {
    // Extract roomId from URL
    const pathParts = window.location.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1];

    const playerName = localStorage.getItem('playerName');
    const savedPlayerId = localStorage.getItem('playerId');

    // Redirect to name entry if no name
    if (!playerName) {
        window.location.href = '/';
        return;
    }

    // Redirect to lobby if no roomId in URL
    if (!roomId || roomId === 'game') {
        window.location.href = '/lobby';
        return;
    }

    const state = getState();
    state.roomId = roomId;
    setPlayerName(playerName);

    console.log('Initializing game with roomId:', roomId, 'playerName:', playerName);

    // Set up back to lobby button
    const backToLobbyButton = document.getElementById('back-to-lobby');
    if (backToLobbyButton) {
        backToLobbyButton.addEventListener('click', () => {
            if (!state.roomId) {
                window.location.href = '/lobby';
                return;
            }

            const roomIdToLeave = state.roomId;
            log(`${getPlayerName()} has left the quest`);

            getSocket().emit('leaveRoom', { roomId: roomIdToLeave }, (response) => {
                if (response.error) {
                    console.error('Error leaving room:', response.error);
                }

                // Clear state
                state.roomId = null;
                state.playerId = null;
                state.initComplete = false;
                state.log = [];
                state.players = [];
                state.currentPlayer = null;
                state.turnOrder = [];
                state.traps = [];
                state.goblins = [];
                state.goldPiles = [];
                state.gameOver = false;
                state.extraShopBuys = {};
                state.stateSyncRetries = 0;
                setGrid(null);

                // Clear localStorage
                localStorage.removeItem('playerId');
                localStorage.removeItem('roomId');

                window.location.href = '/lobby';
            });
        });
    }

    // Initialize socket listeners and items
    initSocketListeners();
    initializeItemEffects();

    // Set up spin button
    document.getElementById('spin-button').addEventListener('click', spinWheel);

    // Wait for socket to connect before joining
    const socket = getSocket();

    if (socket.connected) {
        console.log('Socket already connected, joining room immediately');
        joinRoomAndFetchGrid(roomId, playerName, state);
    } else {
        console.log('Socket not connected, waiting for connection');
        socket.on('connect', () => {
            console.log('Socket connected, now joining room');
            joinRoomAndFetchGrid(roomId, playerName, state);
        });
    }
}

function joinRoomAndFetchGrid(roomId, playerName, state) {
    // Join the room first, then fetch grid
    console.log('Attempting to join room:', roomId, 'with name:', playerName);
    getSocket().emit('join', { roomId, name: playerName }, response => {
        console.log('Join response:', response);

        if (response.error) {
            alert(`Error joining room: ${response.error}`);
            window.location.href = '/lobby';
            return;
        }

        state.playerId = response.playerId;
        state.memoryMode = response.memoryMode;
        localStorage.setItem('playerId', response.playerId);

        console.log('Successfully joined room, playerId:', response.playerId);

        // Now fetch the grid
        fetchGrid();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
});