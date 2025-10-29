// config.js - Game configuration and constants

const wheelConfig = {
    good: [
        { label: '+2 Gold', color: '#4a7043' },
        { label: '+3 Gold', color: '#5a8a53' },
        { label: '+5 Gold', color: '#4a7043' },
        { label: 'x2 Gold', color: '#5a8a53' },
        { label: 'Send Someone to Shadow Realm', color: '#2b2b2b' },
        { label: 'Access Shop', color: '#d4a017' },
        { label: 'Free Scout Lens', color: '#4a7043' },
        { label: 'Go Again', color: '#5a8a53' },
    ],
    bad: [
        { label: '-2 Gold', color: '#703434' },
        { label: 'Go to Shadow Realm', color: '#2b2b2b' },
        { label: 'Return Home', color: '#8b0000' },
        { label: 'No Effect', color: '#703434' },
        { label: 'Spin Again', color: '#703434' },
        { label: 'Give Item Away', color: '#703434' },
        { label: 'Give All Gold Away', color: '#703434' },
        { label: 'Swap Places', color: '#703434' },
        { label: 'Teleport', color: '#703434' },
    ],
    combat: [
        { label: 'Steal', color: '#8b0000' },
        { label: 'Shadow', color: '#2b2b2b' },
        { label: 'Truce', color: '#4a7043' },
        { label: 'No Effect', color: '#6b5b3e' },
    ],
};

const shopItems = [
    {
        name: 'Scout Lens',
        cost: 2,
        max: Infinity,
        effect: null, // Will be set in items.js
        sprite: 'images/items/scoutLens.png',
        description: 'Reveals all adjacent connected spaces (types, players, items/gold/traps/goblins on them) and broadcasts this info to the log for all players.'
    },
    {
        name: 'Chaos Swap',
        cost: 4,
        max: 2,
        effect: null,
        sprite: 'images/items/chaosSwap.png',
        description: 'Randomly swaps positions of two random players (could include you). Positions are broadcasted to all players.'
    },
    {
        name: 'Crown Compass',
        cost: 3,
        max: 3,
        effect: null,
        sprite: 'images/items/crownCompass.png',
        description: 'Broadcasts which connected adjacent space(s) lead closer to the Crown (all equal options listed; based on shortest path).'
    },
    {
        name: 'Thief\'s Snare',
        cost: 3,
        max: 2,
        effect: null,
        sprite: 'images/items/thiefsSnare.png',
        description: 'Sets a trap on current space that steals 2 gold from the next player to land there (persists until triggered).'
    },
    {
        name: 'Bounty Drop',
        cost: 2,
        max: Infinity,
        effect: null,
        sprite: 'images/items/bountyDrop.png',
        description: 'Places 3 gold on a random adjacent connected space. First player to land there claims it.'
    },
    {
        name: 'Misfortune Curse',
        cost: 5,
        max: 1,
        effect: null,
        sprite: 'images/items/misfortuneCurse.png',
        description: 'Forces a chosen player to lose 2 gold immediately (or sell items if they don\'t have enough).'
    },
    {
        name: 'Close-Quarters Heist',
        cost: 4,
        max: 2,
        effect: null,
        sprite: 'images/items/closeQuartersHeist.png',
        description: 'If another player is on your space, steal 4 gold from them. Only works if you share a space with another player.'
    },
    {
        name: 'Wandering Goblin',
        cost: 5,
        max: 1,
        effect: null,
        sprite: 'images/items/wanderingGoblin.png',
        description: 'Spawns a goblin on your space that moves randomly each round end. Steals 1 gold from the first player it encounters (max 5 rounds active).'
    },
    {
        name: 'Warding Talisman',
        cost: 6,
        max: 2,
        effect: null,
        sprite: 'images/items/wardingTalisman.png',
        description: 'Repels one negative effect (e.g., Bad wheel, trap, or other harmful effects). Auto-consumed when triggered.'
    }
];