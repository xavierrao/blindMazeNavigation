const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

app.use(express.static('public'));

// Serve specific HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'name.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'lobby.html'));
});

app.get('/game/:roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'game.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'faq.html'));
});

const rooms = {};

function generateGrid(startSpaceId = 12) {
    const result = spawnSync('python3', [path.join(__dirname, 'public', 'scripts', 'grid_generator.py'), startSpaceId.toString()]);
    if (result.error) {
        console.error('Error generating grid:', result.error);
        return null;
    }
    try {
        return JSON.parse(result.stdout.toString());
    } catch (e) {
        console.error('Error parsing grid JSON:', e.message);
        return null;
    }
}

app.get('/api/grid', (req, res) => {
    const roomId = req.query.roomId;
    if (!roomId || !rooms[roomId]) {
        res.status(400).send('Invalid or missing roomId');
        return;
    }
    if (!rooms[roomId].grid) {
        console.log(`Generating new grid for room ${roomId}`);
        rooms[roomId].grid = generateGrid();
        if (!rooms[roomId].grid) {
            res.status(500).send('Failed to generate grid');
            return;
        }
    }
    res.json(rooms[roomId].grid);
});

app.get('/api/map-image', (req, res) => {
    const roomId = req.query.roomId;
    if (!roomId || !rooms[roomId]) {
        res.status(400).send('Invalid or missing roomId');
        return;
    }

    const grid = rooms[roomId].grid;
    if (!grid) {
        res.status(400).send('Grid not found');
        return;
    }

    // Prepare players data with only name and position
    const playersData = rooms[roomId].state.players.map(p => ({
        name: p.name,
        position: p.position
    }));

    // Call the map generator with grid data and players data as JSON
    const result = spawnSync('python3', [path.join(__dirname, 'public', 'scripts', 'map_generator.py'), JSON.stringify(grid.spaces), JSON.stringify(playersData)]);
    if (result.error || result.status !== 0) {
        console.error('Error generating map image:', result.error || result.stderr.toString());
        res.status(500).send('Failed to generate map image');
        return;
    }

    const base64Image = result.stdout.toString().trim();
    res.json({ image: `data:image/png;base64,${base64Image}` });
});

io.on('connection', (socket) => {
    socket.on('create', ({ memoryMode, randomStartSpace, name }, callback) => {
        console.log('Create event received:', { memoryMode, randomStartSpace, name });

        const roomId = Math.random().toString(36).substring(2, 10);
        const playerId = Math.random().toString(36).substring(2, 10);

        let startSpaceId = 12; // Default
        if (randomStartSpace) {
            startSpaceId = Math.floor(Math.random() * 25);
            console.log(`Random start space selected: ${startSpaceId}`);
        }

        const grid = generateGrid(startSpaceId);

        rooms[roomId] = {
            players: [{ id: playerId, name, gold: 1, items: [], position: startSpaceId, hasMoved: false }],
            grid,
            state: {
                players: [{ id: playerId, name, gold: 1, items: [], position: startSpaceId, hasMoved: false }],
                currentPlayer: null,
                round: 1,
                turnOrder: [],
                log: [],
                memoryMode,
                randomStartSpace,
                startSpaceId,
                traps: [],
                goblins: [],
                goldPiles: [],
                gameOver: false,
                extraShopBuys: {},
                initComplete: false
            }
        };
        if (!rooms[roomId].grid) {
            console.error(`Failed to generate grid for room ${roomId}`);
            callback({ error: 'Failed to generate grid' });
            return;
        }
        socket.join(roomId);
        socket.playerId = playerId;
        socket.roomId = roomId;
        console.log(`Room created: ${roomId}, Player: ${name} (${playerId}), Memory Mode: ${memoryMode}, Random Start: ${randomStartSpace}`);
        callback({ roomId, playerId, memoryMode, randomStartSpace });
        socket.emit('assignPlayerId', { playerId });
        socket.emit('state', rooms[roomId].state);
    });

    socket.on('join', ({ roomId, name }, callback) => {
        if (!rooms[roomId]) {
            console.log(`Join failed for ${name}: Room ${roomId} does not exist`);
            callback({ error: 'Room does not exist' });
            return;
        }

        // Check if this player is already in the room (reconnecting)
        const existingPlayer = rooms[roomId].players.find(p => p.name.toLowerCase() === name.toLowerCase());

        if (existingPlayer) {
            // Player is reconnecting
            console.log(`Player ${name} (${existingPlayer.id}) is reconnecting to room ${roomId}`);
            socket.join(roomId);
            socket.playerId = existingPlayer.id;
            socket.roomId = roomId;

            callback({
                roomId,
                playerId: existingPlayer.id,
                memoryMode: rooms[roomId].state.memoryMode,
                randomStartSpace: rooms[roomId].state.randomStartSpace
            });

            socket.emit('assignPlayerId', { playerId: existingPlayer.id });
            socket.emit('state', rooms[roomId].state);

            if (rooms[roomId].state.initComplete) {
                socket.emit('initComplete', {
                    turnOrder: rooms[roomId].state.turnOrder,
                    currentPlayer: rooms[roomId].state.currentPlayer
                });
            }
            return;
        }

        // New player joining
        if (rooms[roomId].players.length >= 3) {
            console.log(`Join failed for ${name}: Room ${roomId} is full`);
            callback({ error: 'Room is full' });
            return;
        }

        const playerId = Math.random().toString(36).substring(2, 15);
        const startSpaceId = rooms[roomId].state.startSpaceId || 12;
        const player = { id: playerId, name, gold: 1, items: [], position: startSpaceId, hasMoved: false };
        rooms[roomId].players.push(player);
        rooms[roomId].state.players.push(player);
        socket.join(roomId);
        socket.playerId = playerId;
        socket.roomId = roomId;
        io.to(roomId).emit('log', `${name} has joined the quest`);
        console.log(`Player ${name} (${playerId}) joined room: ${roomId}, Players: ${rooms[roomId].players.length}/3`);
        callback({ roomId, playerId, memoryMode: rooms[roomId].state.memoryMode, randomStartSpace: rooms[roomId].state.randomStartSpace });
        socket.emit('assignPlayerId', { playerId });
        socket.emit('state', rooms[roomId].state);
        if (rooms[roomId].players.length === 3) {
            rooms[roomId].state.turnOrder = rooms[roomId].players.map(p => p.id);
            rooms[roomId].state.turnOrder.sort(() => Math.random() - 0.5);
            rooms[roomId].state.currentPlayer = rooms[roomId].state.turnOrder[0];
            rooms[roomId].state.initComplete = true;
            io.to(roomId).emit('initComplete', {
                turnOrder: rooms[roomId].state.turnOrder,
                currentPlayer: rooms[roomId].state.currentPlayer
            });
            io.to(roomId).emit('state', rooms[roomId].state);
            console.log(`Game initialized for room ${roomId}, turnOrder: ${rooms[roomId].state.turnOrder}, currentPlayer: ${rooms[roomId].state.currentPlayer}`);
        }
    });

    socket.on('leaveRoom', ({ roomId }, callback) => {
        if (!rooms[roomId] || !socket.playerId) {
            console.error(`Leave room failed: Room ${roomId} does not exist or no playerId`);
            callback({ success: false, error: 'Invalid room or player' });
            return;
        }
        const player = rooms[roomId].players.find(p => p.id === socket.playerId);
        if (player) {
            console.log(`Player ${player.name} (${socket.playerId}) left room ${roomId}`);
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.playerId);
            rooms[roomId].state.players = rooms[roomId].state.players.filter(p => p.id !== socket.playerId);
            io.to(roomId).emit('log', `${player.name} has left the quest`);
            socket.leave(roomId);
            if (rooms[roomId].players.length === 0) {
                console.log(`Room ${roomId} is empty, deleting room`);
                delete rooms[roomId];
            } else {
                // Update turn order if necessary
                if (rooms[roomId].state.turnOrder.includes(socket.playerId)) {
                    rooms[roomId].state.turnOrder = rooms[roomId].state.turnOrder.filter(id => id !== socket.playerId);
                    if (rooms[roomId].state.currentPlayer === socket.playerId) {
                        const nextIndex = rooms[roomId].state.turnOrder.length > 0 ? 0 : -1;
                        rooms[roomId].state.currentPlayer = nextIndex >= 0 ? rooms[roomId].state.turnOrder[nextIndex] : null;
                    }
                }
                io.to(roomId).emit('state', rooms[roomId].state);
            }
            socket.roomId = null;
            socket.playerId = null;
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Player not found in room' });
        }
    });

    socket.on('init', (roomId) => {
        if (rooms[roomId] && rooms[roomId].state.initComplete) {
            socket.emit('initComplete', {
                turnOrder: rooms[roomId].state.turnOrder,
                currentPlayer: rooms[roomId].state.currentPlayer
            });
            socket.emit('state', rooms[roomId].state);
        }
    });

    socket.on('update', ({ roomId, state: newState }) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }

        // Deep merge players array to ensure hasMoved and other properties sync correctly
        if (newState.players) {
            rooms[roomId].state.players = newState.players.map(newPlayer => {
                const existingPlayer = rooms[roomId].state.players.find(p => p.id === newPlayer.id);
                return existingPlayer ? { ...existingPlayer, ...newPlayer } : newPlayer;
            });
        }

        // Merge other state properties
        rooms[roomId].state = {
            ...rooms[roomId].state,
            ...newState,
            players: rooms[roomId].state.players // Use the merged players array
        };

        console.log(`Received state update for room ${roomId}, new currentPlayer: ${rooms[roomId].state.currentPlayer}, player positions: ${rooms[roomId].state.players.map(p => `${p.name}: ${p.position}`).join(', ')}, hasMoved: ${rooms[roomId].state.players.map(p => `${p.name}: ${p.hasMoved}`).join(', ')}`);
        io.to(roomId).emit('state', rooms[roomId].state);
    });

    socket.on('log', (message) => {
        if (socket.roomId && rooms[socket.roomId]) {
            rooms[socket.roomId].state.log.push(message);
            io.to(socket.roomId).emit('log', message);
        }
    });

    socket.on('gameOver', ({ roomId, reason }) => {
        if (rooms[roomId]) {
            rooms[roomId].state.gameOver = true;
            io.to(roomId).emit('gameOver', reason);
            console.log(`Game over in room ${roomId}: ${reason}`);
        }
    });

    socket.on('buyCallback', ({ roomId }) => {
        if (rooms[roomId]) {
            io.to(roomId).emit('state', rooms[roomId].state);
        }
    });

    socket.on('startMinigame', ({ roomId, combatResult, gameType }) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }

        console.log(`Starting mini-game for room ${roomId}, type: ${gameType}, combat result: ${combatResult}`);

        // Broadcast to ALL players in the room with the same game type
        io.to(roomId).emit('minigameStart', { combatResult, gameType });
    });

    socket.on('minigameUpdate', ({ roomId, gameState }) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }

        // Store mini-game state in room
        rooms[roomId].miniGameState = gameState;

        console.log(`Mini-game update for room ${roomId}:`, gameState.type, gameState.currentPlayerIndex);

        // Broadcast mini-game state to all players in room
        io.to(roomId).emit('minigameStateUpdate', gameState);
    });

    socket.on('requestState', ({ roomId }) => {
        if (rooms[roomId]) {
            socket.emit('state', rooms[roomId].state);
            if (rooms[roomId].state.initComplete) {
                socket.emit('initComplete', {
                    turnOrder: rooms[roomId].state.turnOrder,
                    currentPlayer: rooms[roomId].state.currentPlayer
                });
            }
        }
    });

    socket.on('requestPlayerId', ({ roomId }) => {
        if (rooms[roomId] && socket.playerId) {
            socket.emit('assignPlayerId', { playerId: socket.playerId });
            socket.emit('state', rooms[roomId].state);
        }
    });

    socket.on('disconnect', () => {
        if (socket.roomId && rooms[socket.roomId]) {
            const player = rooms[socket.roomId].players.find(p => p.id === socket.playerId);
            if (player) {
                console.log(`Player ${player.name} (${socket.playerId}) disconnected from room ${socket.roomId}`);
                // Don't emit "left the quest" message or remove player immediately
                // They might be reconnecting (e.g., navigating between pages)

                // Only delete the room if it's been empty for a while
                // For now, just log the disconnect but keep the room
                console.log(`Keeping room ${socket.roomId} active for potential reconnection`);

                // Optional: Set a timeout to clean up abandoned rooms after 5 minutes
                setTimeout(() => {
                    if (rooms[socket.roomId]) {
                        const allDisconnected = rooms[socket.roomId].players.every(p => {
                            // Check if any socket is still connected for this player
                            const sockets = Array.from(io.sockets.sockets.values());
                            return !sockets.some(s => s.playerId === p.id);
                        });

                        if (allDisconnected) {
                            console.log(`Room ${socket.roomId} has been abandoned, deleting`);
                            delete rooms[socket.roomId];
                        }
                    }
                }, 300000); // 5 minutes
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});