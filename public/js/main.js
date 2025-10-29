// main.js - Main game initialization

function initGame() {
    document.getElementById('name-entry').classList.add('active-page');
    document.getElementById('room-container').style.display = 'none';
    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('game').style.display = 'none';

    const nameInput = document.getElementById('player-name');
    const continueButton = document.getElementById('continue-name');
    const backToRoomButton = document.getElementById('back-to-room-selection');

    if (!nameInput || !continueButton || !backToRoomButton) {
        console.error('Error: #player-name or #continue-name not found in DOM');
        alert('Error: Name entry elements not found. Please check index.html.');
        return;
    }

    nameInput.addEventListener('input', () => {
        const name = nameInput.value.trim();
        continueButton.disabled = name.length === 0 || name.length > 20;
    });
    
    continueButton.addEventListener('click', () => {
        setPlayerName(nameInput.value.trim());
        document.getElementById('name-entry').classList.remove('active-page');
        document.getElementById('name-entry').style.display = 'none';
        document.getElementById('room-container').style.display = 'flex';
        document.getElementById('room-container').classList.add('active-page');
        document.getElementById('room-selection').style.display = 'block';
        document.getElementById('room-id-display').style.display = 'none';
    });

    document.getElementById('create-room').addEventListener('click', createGame);
    document.getElementById('join-room').addEventListener('click', joinRoom);
    document.getElementById('back-to-name').addEventListener('click', () => {
        document.getElementById('room-container').classList.remove('active-page');
        document.getElementById('room-container').style.display = 'none';
        document.getElementById('room-selection').style.display = 'none';
        document.getElementById('room-id').value = '';
        document.getElementById('name-entry').style.display = 'flex';
        document.getElementById('name-entry').classList.add('active-page');
    });
    
    backToRoomButton.addEventListener('click', () => {
        const state = getState();
        if (!state.roomId) {
            console.warn('No roomId set, cannot leave room');
            return;
        }

        document.getElementById('game').classList.remove('active-page');
        document.getElementById('game').style.display = 'none';
        document.getElementById('room-container').style.display = 'flex';
        document.getElementById('room-container').classList.add('active-page');
        document.getElementById('room-selection').style.display = 'block';
        document.getElementById('room-id').value = '';

        const roomIdToLeave = state.roomId;
        log(`${getPlayerName()} has left the quest`);

        getSocket().emit('leaveRoom', { roomId: roomIdToLeave }, (response) => {
            if (response.error) {
                console.error('Error leaving room:', response.error);
                alert(`Error leaving room: ${response.error}`);
                return;
            }

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
            updateLog();
        });
    });

    initSocketListeners();
    initializeItemEffects();
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    document.getElementById('spin-button').addEventListener('click', spinWheel);
});