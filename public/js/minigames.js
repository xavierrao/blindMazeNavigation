const miniGameState = {
    active: false,
    type: null, // 'tictactoe', 'reversi', 'coinclash'
    players: [], // Array of player IDs in turn order
    currentPlayerIndex: 0,
    gameData: null, // Game-specific data
    onComplete: null // Callback when game ends
};

// ==================== TIC-TAC-TOE (4x4, 3-in-a-row) ====================
function initTicTacToe(playerIds, onComplete) {
    // Reset all state flags for fresh game
    miniGameState.active = true;
    miniGameState.type = 'tictactoe';
    miniGameState.players = playerIds;
    miniGameState.currentPlayerIndex = 0;
    miniGameState.onComplete = onComplete;
    miniGameState.endScreenShown = false;
    miniGameState.completedCalled = false;
    miniGameState.endingTicTacToe = false;

    const symbols = ['X', 'O', '△'];

    miniGameState.gameData = {
        board: Array(16).fill(null),
        symbols: {},
        piecesPlaced: {},
        moveCount: 0,
        winner: null,
        hasEnded: false
    };

    playerIds.forEach((id, idx) => {
        miniGameState.gameData.symbols[id] = symbols[idx];
        miniGameState.gameData.piecesPlaced[id] = [];
    });

    showTicTacToeModal();
}

function showTicTacToeModal() {
    const modal = document.getElementById('minigame-modal');
    const container = document.getElementById('minigame-container');

    const state = getState();
    const currentPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    const mySymbol = miniGameState.gameData.symbols[state.playerId];
    const myPieceCount = miniGameState.gameData.piecesPlaced[state.playerId].length;

    container.innerHTML = `
        <h2>Three-Player Tic-Tac-Toe</h2>
        <p>Current Turn: ${currentPlayer.name} (${miniGameState.gameData.symbols[currentPlayerId]})</p>
        <p>Your Symbol: ${mySymbol} (${myPieceCount}/3 pieces placed)</p>
        <p style="font-size: 14px; color: #d4a017;">After 3 pieces, oldest piece is removed when placing new ones</p>
        <div id="tictactoe-board" style="display: grid; grid-template-columns: repeat(4, 80px); gap: 5px; margin: 20px auto;"></div>
        <div id="tictactoe-status"></div>
    `;

    const board = document.getElementById('tictactoe-board');
    miniGameState.gameData.board.forEach((cell, idx) => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'tictactoe-cell';
        cellDiv.style.cssText = 'width: 80px; height: 80px; background: #4a3728; border: 2px solid #d4a017; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #d4a017; cursor: pointer;';
        cellDiv.textContent = cell || '';

        const isMyTurn = currentPlayerId === state.playerId;

        if (isMyTurn && !miniGameState.gameData.winner && cell === null) {
            cellDiv.onclick = () => handleTicTacToeClick(idx);
            cellDiv.style.cursor = 'pointer';
        } else {
            cellDiv.style.cursor = 'not-allowed';
            cellDiv.style.opacity = cell ? '1' : '0.7';
        }

        board.appendChild(cellDiv);
    });

    modal.style.display = 'flex';
}

function handleTicTacToeClick(idx) {
    const state = getState();
    const currentPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
    const mySymbol = miniGameState.gameData.symbols[state.playerId];

    if (currentPlayerId !== state.playerId) return;
    if (miniGameState.gameData.board[idx] !== null) return;

    // Get player's piece history
    const myPieces = miniGameState.gameData.piecesPlaced[state.playerId];

    // If player has 3 pieces, remove the oldest one
    if (myPieces.length >= 3) {
        const oldestPiece = myPieces.shift(); // Remove first (oldest) piece
        miniGameState.gameData.board[oldestPiece] = null;
    }

    // Place new piece
    miniGameState.gameData.board[idx] = mySymbol;
    myPieces.push(idx); // Add to end of array (newest piece)
    miniGameState.gameData.moveCount++;

    // Check for immediate win
    if (checkTicTacToeWin(mySymbol)) {
        miniGameState.gameData.winner = state.playerId;
        miniGameState.gameData.hasEnded = true;

        // Broadcast win to all players
        getSocket().emit('minigameUpdate', {
            roomId: state.roomId,
            gameState: miniGameState
        });

        // Show end screen for this player
        endTicTacToe();
        return;
    }

    advanceTicTacToeTurn();
}

function checkTicTacToeWin(symbol) {
    const board = miniGameState.gameData.board;

    // Check rows (all possible 3-in-a-row in each row)
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col <= 1; col++) {
            const idx = row * 4 + col;
            if (board[idx] === symbol && board[idx + 1] === symbol && board[idx + 2] === symbol) {
                return true;
            }
        }
    }

    // Check columns (all possible 3-in-a-row in each column)
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row <= 1; row++) {
            const idx = row * 4 + col;
            if (board[idx] === symbol && board[idx + 4] === symbol && board[idx + 8] === symbol) {
                return true;
            }
        }
    }

    // Check diagonals (all possible 3-in-a-row diagonals on 4x4)
    const diagonals = [
        [0, 5, 10], [1, 6, 11], [4, 9, 14], [5, 10, 15], // NW-SE
        [2, 5, 8], [3, 6, 9], [6, 9, 12], [7, 10, 13], // NE-SW
    ];

    for (const diag of diagonals) {
        if (diag.every(idx => board[idx] === symbol)) {
            return true;
        }
    }

    return false;
}

function advanceTicTacToeTurn() {
    miniGameState.currentPlayerIndex = (miniGameState.currentPlayerIndex + 1) % miniGameState.players.length;

    // Broadcast state update
    getSocket().emit('minigameUpdate', {
        roomId: getState().roomId,
        gameState: miniGameState
    });

    showTicTacToeModal();
}

function endTicTacToe() {
    const state = getState();

    // Prevent multiple calls
    if (miniGameState.endingTicTacToe) {
        console.log('Tic-Tac-Toe already ending, skipping');
        return;
    }

    miniGameState.endingTicTacToe = true;

    const winner = state.players.find(p => p.id === miniGameState.gameData.winner);

    // Show winner and countdown
    const container = document.getElementById('minigame-container');
    let countdown = 3;

    container.innerHTML = `
        <h2>🎯 Tic-Tac-Toe Complete!</h2>
        <div style="font-size: 48px; margin: 30px 0;">🏆</div>
        <p style="font-size: 24px; color: #d4a017; font-weight: bold;">${winner.name} wins!</p>
        <p style="font-size: 18px; margin-top: 30px;">Returning to game in <span id="countdown" style="color: #d4a017; font-weight: bold;">${countdown}</span>...</p>
    `;

    const countdownInterval = setInterval(() => {
        countdown--;
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('minigame-modal').style.display = 'none';

            // Only call onComplete once
            if (miniGameState.onComplete && !miniGameState.completedCalled) {
                miniGameState.completedCalled = true;
                miniGameState.onComplete(winner.id);
            }

            miniGameState.active = false;
            miniGameState.endingTicTacToe = false;
        }
    }, 1000);
}

// ==================== TRI-COLOR REVERSI (6x6) ====================
function initReversi(playerIds, onComplete) {
    // Reset all state flags for fresh game
    miniGameState.active = true;
    miniGameState.type = 'reversi';
    miniGameState.players = playerIds;
    miniGameState.currentPlayerIndex = 0;
    miniGameState.onComplete = onComplete;
    miniGameState.endScreenShown = false;
    miniGameState.completedCalled = false;
    miniGameState.endingReversi = false;

    const colors = ['⚫', '⚪', '🔴'];

    const board = Array(36).fill(null);

    board[14] = colors[0];
    board[15] = colors[1];
    board[20] = colors[2];
    board[21] = colors[0];
    board[26] = colors[1];
    board[27] = colors[2];

    miniGameState.gameData = {
        board,
        colors: {},
        winner: null,
        passes: 0,
        hasEnded: false
    };

    playerIds.forEach((id, idx) => {
        miniGameState.gameData.colors[id] = colors[idx];
    });

    showReversiModal();
}

function showReversiModal() {
    const modal = document.getElementById('minigame-modal');
    const container = document.getElementById('minigame-container');

    const state = getState();
    const currentPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    const myColor = miniGameState.gameData.colors[state.playerId];
    const myPlayerId = state.playerId;

    // Check if I have any valid moves
    let iHaveValidMoves = false;
    if (currentPlayerId === myPlayerId) {
        for (let i = 0; i < 36; i++) {
            if (canPlaceReversi(i, myColor)) {
                iHaveValidMoves = true;
                break;
            }
        }
    }

    // Count tiles for each player
    const tileCounts = {};
    miniGameState.players.forEach(id => {
        const color = miniGameState.gameData.colors[id];
        tileCounts[id] = miniGameState.gameData.board.filter(c => c === color).length;
    });

    container.innerHTML = `
        <h2>Tri-Color Reversi (6x6)</h2>
        <p>Current Turn: ${currentPlayer.name} (${miniGameState.gameData.colors[currentPlayerId]})</p>
        <p>Your Color: ${myColor}</p>
        ${currentPlayerId === myPlayerId && !iHaveValidMoves ?
            '<p style="color: #703434; font-weight: bold;">⚠️ No valid moves - your turn will be skipped</p>' : ''}
        <div style="margin: 10px 0; font-size: 14px;">
            ${miniGameState.players.map(id => {
                const player = state.players.find(p => p.id === id);
                return `<span style="margin: 0 8px;">${miniGameState.gameData.colors[id]} ${player.name}: ${tileCounts[id]}</span>`;
            }).join('')}
        </div>
        <div id="reversi-board" style="display: grid; grid-template-columns: repeat(6, 60px); gap: 2px; margin: 20px auto;"></div>
        <button id="reversi-pass" class="fantasy-button" style="margin-top: 10px;">Pass Turn</button>
    `;

    const board = document.getElementById('reversi-board');
    miniGameState.gameData.board.forEach((cell, idx) => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'reversi-cell';
        cellDiv.style.cssText = 'width: 60px; height: 60px; background: #2d5016; border: 1px solid #000; display: flex; align-items: center; justify-content: center; font-size: 36px; cursor: pointer;';
        cellDiv.textContent = cell || '';

        const isMyTurn = currentPlayerId === state.playerId;
        const validMove = isMyTurn && canPlaceReversi(idx, myColor);

        if (validMove && !miniGameState.gameData.winner) {
            cellDiv.style.background = '#3d6026';
            cellDiv.onclick = () => handleReversiClick(idx);
        } else if (!cell) {
            cellDiv.style.opacity = '0.5';
        }

        board.appendChild(cellDiv);
    });

    // Pass button
    const passButton = document.getElementById('reversi-pass');
    if (currentPlayerId === state.playerId) {
        passButton.onclick = () => handleReversiPass();
    } else {
        passButton.disabled = true;
    }

    modal.style.display = 'flex';
}

function canPlaceReversi(idx, color) {
    if (miniGameState.gameData.board[idx] !== null) return false;

    const directions = [-7, -6, -5, -1, 1, 5, 6, 7]; // 8 directions on 6x6 grid

    for (const dir of directions) {
        if (checkReversiDirection(idx, color, dir)) {
            return true;
        }
    }

    return false;
}

function checkReversiDirection(startIdx, color, direction) {
    const board = miniGameState.gameData.board;
    let idx = startIdx + direction;
    let foundOpponent = false;

    const startRow = Math.floor(startIdx / 6);
    const startCol = startIdx % 6;

    while (idx >= 0 && idx < 36) {
        const currentRow = Math.floor(idx / 6);
        const currentCol = idx % 6;

        // Check if we stayed in bounds (prevent wrapping)
        // For horizontal moves (direction -1 or 1), row must stay same
        if (Math.abs(direction) === 1 && currentRow !== startRow) break;

        // For vertical moves (direction -6 or 6), col must stay same
        if (Math.abs(direction) === 6 && currentCol !== startCol) break;

        // For diagonal moves, check we didn't wrap around edges
        if (Math.abs(direction) === 5 || Math.abs(direction) === 7) {
            const rowDiff = Math.abs(currentRow - startRow);
            const colDiff = Math.abs(currentCol - startCol);
            if (rowDiff !== colDiff) break; // Not a valid diagonal anymore
        }

        if (board[idx] === null) break;
        if (board[idx] === color) {
            return foundOpponent;
        }

        foundOpponent = true;
        idx += direction;
    }

    return false;
}

function flipReversiDirection(startIdx, color, direction) {
    const board = miniGameState.gameData.board;
    let idx = startIdx + direction;
    const toFlip = [];

    while (idx >= 0 && idx < 36) {
        if (board[idx] === null) break;
        if (board[idx] === color) {
            // Flip all collected pieces
            toFlip.forEach(i => board[i] = color);
            break;
        }

        toFlip.push(idx);
        idx += direction;
    }
}

function handleReversiClick(idx) {
    const state = getState();
    const currentPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
    const myColor = miniGameState.gameData.colors[state.playerId];

    if (currentPlayerId !== state.playerId) return;
    if (!canPlaceReversi(idx, myColor)) return;

    // Place piece
    miniGameState.gameData.board[idx] = myColor;

    // Flip pieces in all valid directions
    const directions = [-7, -6, -5, -1, 1, 5, 6, 7];
    for (const dir of directions) {
        if (checkReversiDirection(idx, myColor, dir)) {
            flipReversiDirection(idx, myColor, dir);
        }
    }

    advanceReversiTurn();
}

function advanceReversiTurn() {
    miniGameState.gameData.passes = 0;

    // Move to next player
    miniGameState.currentPlayerIndex = (miniGameState.currentPlayerIndex + 1) % miniGameState.players.length;

    // Check if the current player has any valid moves
    let currentPlayerHasMoves = false;
    const currentPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
    const currentPlayerColor = miniGameState.gameData.colors[currentPlayerId];

    for (let i = 0; i < 36; i++) {
        if (canPlaceReversi(i, currentPlayerColor)) {
            currentPlayerHasMoves = true;
            break;
        }
    }

    // If current player has no moves, skip them
    let attempts = 0;
    while (!currentPlayerHasMoves && attempts < 3) {
        const state = getState();
        const skippedPlayer = state.players.find(p => p.id === currentPlayerId);
        log(`${skippedPlayer.name} has no valid moves, skipping turn`);

        // Move to next player
        miniGameState.currentPlayerIndex = (miniGameState.currentPlayerIndex + 1) % miniGameState.players.length;
        attempts++;

        // Check if this player has moves
        const nextPlayerId = miniGameState.players[miniGameState.currentPlayerIndex];
        const nextPlayerColor = miniGameState.gameData.colors[nextPlayerId];

        currentPlayerHasMoves = false;
        for (let i = 0; i < 36; i++) {
            if (canPlaceReversi(i, nextPlayerColor)) {
                currentPlayerHasMoves = true;
                break;
            }
        }

        if (currentPlayerHasMoves) {
            break;
        }
    }

    // If no one has valid moves after checking all players, game over
    if (attempts >= 3 || !currentPlayerHasMoves) {
        const state = getState();

        // Count tiles
        const counts = {};
        miniGameState.players.forEach(id => {
            const color = miniGameState.gameData.colors[id];
            counts[id] = miniGameState.gameData.board.filter(c => c === color).length;
        });

        // Find winner
        const maxTiles = Math.max(...Object.values(counts));
        const winners = Object.keys(counts).filter(id => counts[id] === maxTiles);
        const winnerId = winners[0];

        miniGameState.gameData.winner = winnerId;
        miniGameState.gameData.hasEnded = true;

        // Broadcast end to all players
        getSocket().emit('minigameUpdate', {
            roomId: state.roomId,
            gameState: miniGameState
        });

        endReversi();
        return;
    }

    getSocket().emit('minigameUpdate', {
        roomId: getState().roomId,
        gameState: miniGameState
    });

    showReversiModal();
}

function handleReversiPass() {
    miniGameState.gameData.passes++;

    if (miniGameState.gameData.passes >= 3) {
        // All players passed, end game
        const state = getState();

        // Count tiles
        const counts = {};
        miniGameState.players.forEach(id => {
            const color = miniGameState.gameData.colors[id];
            counts[id] = miniGameState.gameData.board.filter(c => c === color).length;
        });

        // Find winner
        const maxTiles = Math.max(...Object.values(counts));
        const winners = Object.keys(counts).filter(id => counts[id] === maxTiles);
        const winnerId = winners[0];

        miniGameState.gameData.winner = winnerId;
        miniGameState.gameData.hasEnded = true;

        // Broadcast end to all players
        getSocket().emit('minigameUpdate', {
            roomId: state.roomId,
            gameState: miniGameState
        });

        endReversi();
        return;
    }

    advanceReversiTurn();
}

function endReversi() {
    const state = getState();

    if (miniGameState.endingReversi) {
        console.log('Reversi already ending, skipping');
        return;
    }

    miniGameState.endingReversi = true;

    // Count tiles for each color
    const counts = {};
    miniGameState.players.forEach(id => {
        const color = miniGameState.gameData.colors[id];
        counts[id] = miniGameState.gameData.board.filter(c => c === color).length;
    });

    // Find max tiles
    const maxTiles = Math.max(...Object.values(counts));

    // Find all players with max tiles
    const winners = Object.keys(counts).filter(id => counts[id] === maxTiles);

    let winnerText;
    let winnerId;

    if (winners.length > 1) {
        // It's a tie!
        const winnerNames = winners.map(id => state.players.find(p => p.id === id).name).join(', ');
        winnerText = `It's a tie! ${winnerNames} all have ${maxTiles} tiles!`;
        winnerId = winners[0];
    } else {
        // Single winner
        winnerId = winners[0];
        const winner = state.players.find(p => p.id === winnerId);
        winnerText = `${winner.name} wins with ${maxTiles} tiles!`;
    }

    const container = document.getElementById('minigame-container');
    let countdown = 3;

    container.innerHTML = `
        <h2>⚫ Tri-Color Reversi Complete!</h2>
        <div style="font-size: 48px; margin: 30px 0;">🏆</div>
        <p style="font-size: 24px; color: #d4a017; font-weight: bold;">${winnerText}</p>
        <div style="margin: 20px 0;">
            ${miniGameState.players.map(id => {
        const player = state.players.find(p => p.id === id);
        return `<p>${player.name}: ${counts[id]} tiles</p>`;
    }).join('')}
        </div>
        <p style="font-size: 18px; margin-top: 30px;">Returning to game in <span id="countdown" style="color: #d4a017; font-weight: bold;">${countdown}</span>...</p>
    `;

    const countdownInterval = setInterval(() => {
        countdown--;
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('minigame-modal').style.display = 'none';

            if (miniGameState.onComplete && !miniGameState.completedCalled) {
                miniGameState.completedCalled = true;
                miniGameState.onComplete(winnerId);
            }

            miniGameState.active = false;
            miniGameState.endingReversi = false;
        }
    }, 1000);
}

// ==================== TRIPLE CLASH (Coin Betting) ====================
function initCoinClash(playerIds, onComplete) {
    // Reset all state flags for fresh game
    miniGameState.active = true;
    miniGameState.type = 'coinclash';
    miniGameState.players = playerIds;
    miniGameState.onComplete = onComplete;
    miniGameState.endScreenShown = false;
    miniGameState.completedCalled = false;
    miniGameState.endingCoinClash = false;

    miniGameState.gameData = {
        coins: {},
        roundsWon: {},
        currentRound: 1,
        bets: {},
        betsSubmitted: [],
        winner: null,
        hasEnded: false,
        resolving: false
    };

    playerIds.forEach(id => {
        miniGameState.gameData.coins[id] = 5;
        miniGameState.gameData.roundsWon[id] = 0;
    });

    showCoinClashModal();
}

function showCoinClashModal() {
    const modal = document.getElementById('minigame-modal');
    const container = document.getElementById('minigame-container');

    const state = getState();
    const myCoins = miniGameState.gameData.coins[state.playerId];
    const hasBet = miniGameState.gameData.betsSubmitted.includes(state.playerId);

    // Show player stats
    let statsHTML = '<div style="margin: 10px 0;">';
    miniGameState.players.forEach(id => {
        const player = state.players.find(p => p.id === id);
        const coins = miniGameState.gameData.coins[id];
        const wins = miniGameState.gameData.roundsWon[id];
        const submitted = miniGameState.gameData.betsSubmitted.includes(id) ? '✓' : '⏳';
        statsHTML += `<p>${player.name}: ${coins} coins, ${wins} rounds won ${submitted}</p>`;
    });
    statsHTML += '</div>';

    container.innerHTML = `
        <h2>Triple Clash</h2>
        <p>Round ${miniGameState.gameData.currentRound}</p>
        <p>Your Coins: ${myCoins}</p>
        ${statsHTML}
        ${!hasBet ? `
            <div id="coinclash-betting" style="margin: 20px 0;">
                <p>Choose your bet (0-3 coins):</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="fantasy-button" onclick="submitCoinClashBet(0)">Bet 0</button>
                    <button class="fantasy-button" onclick="submitCoinClashBet(1)" ${myCoins < 1 ? 'disabled' : ''}>Bet 1</button>
                    <button class="fantasy-button" onclick="submitCoinClashBet(2)" ${myCoins < 2 ? 'disabled' : ''}>Bet 2</button>
                    <button class="fantasy-button" onclick="submitCoinClashBet(3)" ${myCoins < 3 ? 'disabled' : ''}>Bet 3</button>
                </div>
            </div>
        ` : '<p>Waiting for other players to bet...</p>'}
        <div id="coinclash-results"></div>
    `;

    modal.style.display = 'flex';
}

function submitCoinClashBet(amount) {
    const state = getState();

    if (miniGameState.gameData.betsSubmitted.includes(state.playerId)) {
        console.log('Already submitted bet');
        return;
    }

    console.log(`${state.playerId} submitting bet: ${amount}`);

    miniGameState.gameData.bets[state.playerId] = amount;
    miniGameState.gameData.betsSubmitted.push(state.playerId);

    // Broadcast bet submission
    getSocket().emit('minigameUpdate', {
        roomId: state.roomId,
        gameState: miniGameState
    });

    // Check if all bets are in
    if (miniGameState.gameData.betsSubmitted.length === miniGameState.players.length) {
        // Only one player should resolve (the first one to complete)
        // Add a small delay to let all bets sync
        setTimeout(() => {
            if (miniGameState.gameData.betsSubmitted.length === miniGameState.players.length) {
                resolveCoinClashRound();
            }
        }, 500);
    } else {
        showCoinClashModal();
    }
}

function resolveCoinClashRound() {
    const state = getState();

    // Prevent multiple resolutions
    if (miniGameState.gameData.resolving) {
        console.log('Round already resolving, skipping');
        return;
    }

    miniGameState.gameData.resolving = true;

    const bets = miniGameState.gameData.bets;

    console.log('Resolving round with bets:', bets);

    // Find highest bet
    const maxBet = Math.max(...Object.values(bets));

    // Find players with highest bet
    const highBetters = Object.keys(bets).filter(id => bets[id] === maxBet);

    let roundWinner = null;
    let resultText = '';

    if (highBetters.length === 1) {
        // Unique highest bet wins
        roundWinner = highBetters[0];
        miniGameState.gameData.roundsWon[roundWinner]++;
        miniGameState.gameData.coins[roundWinner] -= maxBet;

        const winner = state.players.find(p => p.id === roundWinner);
        resultText = `${winner.name} bet ${maxBet} and wins the round! (loses ${maxBet} coins)`;
    } else {
        // Tie for highest - all tied players lose their coins
        highBetters.forEach(id => {
            miniGameState.gameData.coins[id] -= maxBet;
        });

        const tiedNames = highBetters.map(id => state.players.find(p => p.id === id).name).join(', ');
        resultText = `Tie! ${tiedNames} all bet ${maxBet} and lose ${maxBet} coins. No one wins this round.`;
    }

    // Log the result
    log(resultText);

    // Update the modal to show results
    const resultsDiv = document.getElementById('coinclash-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `<p style="background: #4a3728; padding: 15px; margin: 10px 0; border-radius: 5px;">${resultText}</p>`;
    }

    // Broadcast the resolved state
    getSocket().emit('minigameUpdate', {
        roomId: state.roomId,
        gameState: miniGameState
    });

    // Check if game is over
    const allOut = miniGameState.players.every(id => miniGameState.gameData.coins[id] === 0);

    if (allOut) {
        miniGameState.gameData.hasEnded = true;

        // Broadcast end to all players
        getSocket().emit('minigameUpdate', {
            roomId: state.roomId,
            gameState: miniGameState
        });

        setTimeout(() => endCoinClash(), 2000);
        return;
    }

    // Reset for next round
    setTimeout(() => {
        miniGameState.gameData.currentRound++;
        miniGameState.gameData.bets = {};
        miniGameState.gameData.betsSubmitted = [];
        miniGameState.gameData.resolving = false;

        getSocket().emit('minigameUpdate', {
            roomId: state.roomId,
            gameState: miniGameState
        });

        showCoinClashModal();
    }, 3000);
}

function endCoinClash() {
    const state = getState();

    if (miniGameState.endingCoinClash) {
        console.log('Coin Clash already ending, skipping');
        return;
    }

    miniGameState.endingCoinClash = true;

    // Find the maximum rounds won
    const roundsWon = miniGameState.gameData.roundsWon;
    const maxRounds = Math.max(...Object.values(roundsWon));

    // Find all players with max rounds (could be multiple in case of tie)
    const winners = Object.keys(roundsWon).filter(id => roundsWon[id] === maxRounds);

    let winnerText;
    let winnerId;

    if (winners.length > 1) {
        // It's a tie!
        const winnerNames = winners.map(id => state.players.find(p => p.id === id).name).join(', ');
        winnerText = `It's a tie! ${winnerNames} all won ${maxRounds} rounds!`;
        winnerId = winners[0]; // Pick first for reward distribution (or you could split rewards)
    } else {
        // Single winner
        winnerId = winners[0];
        const winner = state.players.find(p => p.id === winnerId);
        winnerText = `${winner.name} wins with ${maxRounds} rounds won!`;
    }

    const container = document.getElementById('minigame-container');
    let countdown = 3;

    container.innerHTML = `
        <h2>🪙 Triple Clash Complete!</h2>
        <div style="font-size: 48px; margin: 30px 0;">🏆</div>
        <p style="font-size: 24px; color: #d4a017; font-weight: bold;">${winnerText}</p>
        <div style="margin: 20px 0;">
            ${miniGameState.players.map(id => {
        const player = state.players.find(p => p.id === id);
        const rounds = miniGameState.gameData.roundsWon[id];
        const coins = miniGameState.gameData.coins[id];
        return `<p>${player.name}: ${rounds} rounds won, ${coins} coins left</p>`;
    }).join('')}
        </div>
        <p style="font-size: 18px; margin-top: 30px;">Returning to game in <span id="countdown" style="color: #d4a017; font-weight: bold;">${countdown}</span>...</p>
    `;

    const countdownInterval = setInterval(() => {
        countdown--;
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
            countdownEl.textContent = countdown;
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            document.getElementById('minigame-modal').style.display = 'none';

            if (miniGameState.onComplete && !miniGameState.completedCalled) {
                miniGameState.completedCalled = true;
                miniGameState.onComplete(winnerId);
            }

            miniGameState.active = false;
            miniGameState.endingCoinClash = false;
        }
    }, 1000);
}

// Make submitCoinClashBet globally accessible
window.submitCoinClashBet = submitCoinClashBet;