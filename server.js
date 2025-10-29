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

const rooms = {};

function generateGrid(startSpaceId = 12) {
    const result = spawnSync('python3', ['public/grid_generator.py', startSpaceId.toString()]);
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
    const result = spawnSync('python3', ['public/map_generator.py', JSON.stringify(grid.spaces), JSON.stringify(playersData)]);
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
        socket.emit('roomCreated', { roomId, memoryMode });
    });

    socket.on('join', ({ roomId, name }, callback) => {
        if (!rooms[roomId] || rooms[roomId].players.length >= 3) {
            console.log(`Join failed for ${name}: Room ${roomId} ${!rooms[roomId] ? 'does not exist' : 'is full'}`);
            callback({ error: !rooms[roomId] ? 'Room does not exist' : 'Room is full' });
            return;
        }

        const duplicateName = rooms[roomId].players.some(p => p.name.toLowerCase() === name.toLowerCase());
        if (duplicateName) {
            console.log(`Join failed for ${name}: Duplicate name in room ${roomId}`);
            callback({ error: 'A player with that name already exists in this quest. Please choose a different name.' });
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
        socket.emit('state', rooms[roomId].state); // Ensure state is sent with playerId
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
                io.to(socket.roomId).emit('log', `${player.name} has left the quest`);
                rooms[socket.roomId].players = rooms[socket.roomId].players.filter(p => p.id !== socket.playerId);
                rooms[socket.roomId].state.players = rooms[socket.roomId].state.players.filter(p => p.id !== socket.playerId);
                if (rooms[socket.roomId].players.length === 0) {
                    console.log(`Room ${socket.roomId} is empty, deleting room`);
                    delete rooms[socket.roomId];
                } else {
                    io.to(socket.roomId).emit('state', rooms[socket.roomId].state);
                }
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});