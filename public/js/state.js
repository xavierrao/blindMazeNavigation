// state.js - Central game state management

const state = {
    players: [],
    currentPlayer: null,
    round: 1,
    turnOrder: [],
    log: [],
    memoryMode: false,
    traps: [],
    goblins: [],
    goldPiles: [],
    gameOver: false,
    extraShopBuys: {},
    roomId: null,
    playerId: null,
    shopAccess: false,
    initComplete: false,
    stateSyncRetries: 0,
    gridHash: null
};

let grid = null;
let playerName = null;

let uiRetryCount = 0;
const maxUIRetries = 5;
const maxStateSyncRetries = 5;

function getState() {
    return state;
}

function getGrid() {
    return grid;
}

function setGrid(newGrid) {
    grid = newGrid;
}

function getPlayerName() {
    return playerName;
}

function setPlayerName(name) {
    playerName = name;
}

function getUIRetryCount() {
    return uiRetryCount;
}

function incrementUIRetryCount() {
    uiRetryCount++;
}

function resetUIRetryCount() {
    uiRetryCount = 0;
}

function getMaxUIRetries() {
    return maxUIRetries;
}

function getMaxStateSyncRetries() {
    return maxStateSyncRetries;
}