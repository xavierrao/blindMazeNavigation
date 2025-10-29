// wheelHandlers.js - Handle wheel spin results

function handleGoodWheelResult(result) {
    const state = getState();
    const player = state.players.find(p => p.id === state.playerId);
    const grid = getGrid();

    if (result === '+2 Gold') {
        player.gold += 2;
        log(`${player.name} spun Good wheel: Gained 2 gold`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === '+3 Gold') {
        player.gold += 3;
        log(`${player.name} spun Good wheel: Gained 3 gold`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === '+5 Gold') {
        player.gold += 5;
        log(`${player.name} spun Good wheel: Gained 5 gold`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'x2 Gold') {
        player.gold *= 2;
        log(`${player.name} spun Good wheel: Gold doubled to ${player.gold}`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Send Someone to Shadow Realm') {
        const shadowRealm = grid.spaces.find(s => s.type === 'ShadowRealm');
        const otherPlayers = state.players.filter(p => p.id !== player.id);
        showPlayerSelectionModal('Send Someone to Shadow Realm', (targetPlayer) => {
            if (shadowRealm) {
                targetPlayer.position = shadowRealm.id;
                targetPlayer.shadowTurns = (targetPlayer.shadowTurns || 0) + 1;
                log(`${player.name} spun Good wheel: Sent ${targetPlayer.name} to Shadow Realm`);
            }
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        }, otherPlayers);
    } else if (result === 'Access Shop') {
        state.shopAccess = true;
        log(`${player.name} spun Good wheel: Gained shop access this turn`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Free Scout Lens') {
        const scoutLens = shopItems.find(i => i.name === 'Scout Lens');
        if (scoutLens) {
            player.items.push(scoutLens);
            log(`${player.name} spun Good wheel: Gained Scout Lens`);
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Go Again') {
        player.hasMoved = false;
        log(`${player.name} spun Good wheel: Get an extra move!`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    }
}

function handleBadWheelResult(result) {
    const state = getState();
    const grid = getGrid();
    const player = state.players.find(p => p.id === state.playerId);

    if (result === '-2 Gold') {
        const amount = Math.min(player.gold, 2);
        sellItemsFor(amount - player.gold, player);
        if (player.gold >= amount) {
            player.gold -= amount;
            log(`${player.name} spun Bad wheel: Lost ${amount} gold`);
        } else {
            log(`${player.name} spun Bad wheel: No gold to lose`);
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Go to Shadow Realm') {
        const shadowRealm = grid.spaces.find(s => s.type === 'ShadowRealm');
        if (shadowRealm) {
            player.position = shadowRealm.id;
            player.shadowTurns = (player.shadowTurns || 0) + 1;
            log(`${player.name} spun Bad wheel: Sent to Shadow Realm`);
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        }
    } else if (result === 'Give Item Away') {
        if (player.items.length === 0) {
            log(`${player.name} spun Bad wheel: No items to give away`);
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        } else {
            showItemSelectionModal('Give Item Away', (itemIndex) => {
                const itemToGive = player.items[itemIndex];
                showPlayerSelectionModal('Give Item Away', (targetPlayer) => {
                    player.items.splice(itemIndex, 1);
                    targetPlayer.items.push(itemToGive);
                    log(`${player.name} spun Bad wheel: Gave ${itemToGive.name} to ${targetPlayer.name}`);
                    getSocket().emit('update', { roomId: state.roomId, state });
                    updateUI();
                });
            });
        }
    } else if (result === 'Give All Gold Away') {
        showPlayerSelectionModal('Give all Gold', (targetPlayer) => {
            const goldAmount = player.gold;
            targetPlayer.gold += goldAmount;
            player.gold = 0;
            log(`${player.name} spun Bad wheel: Gave ${goldAmount} gold to ${targetPlayer.name}`);
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        });
    } else if (result === 'Return Home') {
        const startSpace = grid.spaces.find(s => s.type === 'Start');
        if (startSpace) {
            player.position = startSpace.id;
            log(`${player.name} spun Bad wheel: Returned to Start`);
            player.hasMoved = true;
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Swap Places') {
        const others = state.players.filter(p => p.id !== player.id);
        if (others.length > 0) {
            const targetPlayer = others[Math.floor(Math.random() * others.length)];
            const temp = player.position;
            player.position = targetPlayer.position;
            targetPlayer.position = temp;
            log(`${player.name} spun Bad wheel: Swapped places with ${targetPlayer.name}`);
            player.hasMoved = true;
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Teleport') {
        const currentSpace = grid.spaces[player.position];
        const nonAdj = grid.spaces.filter(s => !currentSpace.connections.includes(s.id) && s.id !== player.position);
        if (nonAdj.length > 0) {
            const target = nonAdj[Math.floor(Math.random() * nonAdj.length)];
            player.position = target.id;
            log(`${player.name} spun Bad wheel: Teleported to ${target.type}`);
            player.hasMoved = true;
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Spin Again') {
        log(`${player.name} spun Bad wheel: Must spin again!`);
        player.spinsRemaining = (player.spinsRemaining || 0) + 2;
        getSocket().emit('update', { roomId: state.roomId, state });
        setTimeout(() => {
            showWheel('bad', handleBadWheelResult);
        }, 500);
    } else if (result === 'No Effect') {
        log(`${player.name} spun Bad wheel: No effect`);
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    }
}

function handleShadowWheelResult(result) {
    const state = getState();
    const grid = getGrid();
    const player = state.players.find(p => p.id === state.playerId);

    if (result === 'Return Home') {
        const startSpace = grid.spaces.find(s => s.type === 'Start');
        if (startSpace) {
            player.position = startSpace.id;
            log(`${player.name} spun Shadow wheel: Returned to Start`);
            player.shadowTurns = 0;
            player.hasMoved = true;
        }
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Nothing') {
        log(`${player.name} spun Shadow wheel: Nothing happened, remains in Shadow Realm`);
        player.hasMoved = true;
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    } else if (result === 'Invite Friend') {
        const others = state.players.filter(p => p.id !== player.id && p.position !== grid.spaces.find(s => s.type === 'ShadowRealm').id);
        if (others.length === 0) {
            log(`${player.name} spun Shadow wheel: No friends to invite`);
            player.hasMoved = true;
            getSocket().emit('update', { roomId: state.roomId, state });
            updateUI();
        } else {
            showPlayerSelectionModal('Invite Friend', (targetPlayer) => {
                const shadowRealm = grid.spaces.find(s => s.type === 'ShadowRealm');
                targetPlayer.position = shadowRealm.id;
                targetPlayer.shadowTurns = (targetPlayer.shadowTurns || 0) + 1;
                log(`${player.name} spun Shadow wheel: Invited ${targetPlayer.name} to Shadow Realm`);
                player.hasMoved = true;
                getSocket().emit('update', { roomId: state.roomId, state });
                updateUI();
            }, others);
        }
    } else if (result === '-1 Gold') {
        const amount = Math.min(player.gold, 1);
        if (player.gold >= amount) {
            player.gold -= amount;
            log(`${player.name} spun Shadow wheel: Lost 1 gold`);
        } else {
            log(`${player.name} spun Shadow wheel: No gold to lose`);
        }
        player.hasMoved = true;
        getSocket().emit('update', { roomId: state.roomId, state });
        updateUI();
    }
}

function handleCombatWheelResult(result) {
    const state = getState();
    const grid = getGrid();
    const player = state.players.find(p => p.id === state.playerId);
    const occupants = state.players.filter(p => p.position === player.position);

    if (result === 'Steal' && occupants.length > 1) {
        const target = shuffle(occupants.filter(p => p.id !== player.id))[0];
        if (target) {
            const amount = Math.min(target.gold, 1);
            sellItemsFor(amount - target.gold, target);
            if (target.gold >= amount) {
                target.gold -= amount;
                player.gold += amount;
                log(`Combat: ${player.name} stole 1 gold from ${target.name}`);
            }
        }
    } else if (result === 'Shadow' && occupants.length > 1) {
        const target = shuffle(occupants.filter(p => p.id !== player.id))[0];
        const shadowRealm = grid.spaces.find(s => s.type === 'ShadowRealm');
        if (target && shadowRealm) {
            target.position = shadowRealm.id;
            log(`Combat: ${target.name} sent to Shadow Realm`);
        }
    } else if (result === 'Truce') {
        occupants.forEach(p => p.gold += 1);
        log(`Combat: All players gain 1 gold (truce)`);
    } else if (result === 'No Effect') {
        log(`Combat: No effect`);
    }

    getSocket().emit('update', { roomId: state.roomId, state });
    updateUI();
}