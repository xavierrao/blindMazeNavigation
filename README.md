# Blind Crown Quest

A multiplayer fantasy board game where 3 players race to reach the Crown while navigating a mysterious grid filled with shops, traps, combat mini-games, and the dreaded Shadow Realm.

## Game Overview

**Blind Crown Quest** is a turn-based strategy game where players must navigate a procedurally generated 5x5 grid to reach the Crown space with at least 5 gold. The twist? The map layout is hidden, forcing players to explore and memorize (or not, with Memory Mode) as they progress.

### Key Features
- **Procedurally Generated Maps**: Every game features a unique grid layout with varied space types and connections
- **Memory Mode**: Optional mode that clears the game log each round, increasing difficulty
- **Random Start Space**: Option to randomize starting positions for added variety
- **Item System**: Purchase and use strategic items from shops to gain advantages
- **Wheel Mechanics**: Land on special spaces to spin wheels with various effects
- **Combat Mini-Games**: Three competitive mini-games triggered by Combat spaces
- **Shadow Realm**: A dangerous space that traps players until they escape via wheel spin
- **Real-time Multiplayer**: Play with 2 other friends via shareable room URLs
- **Multi-Page Architecture**: Clean navigation with shareable game links

## Requirements

- **Node.js** (v14 or higher)
- **Python 3** (with matplotlib)
- Modern web browser with JavaScript enabled

### Python Dependencies
```bash
pip install matplotlib
```

### Node.js Dependencies
```bash
npm install express socket.io
```

## Installation

1. Clone or download the repository
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Install Python dependencies:
   ```bash
   pip install matplotlib
   ```
4. Ensure the following directory structure:
   ```
   ├── server.js
   ├── package.json
   ├── public/
   │   ├── pages/
   │   │   ├── name.html
   │   │   ├── lobby.html
   │   │   ├── game.html
   │   │   └── faq.html
   │   ├── css/
   │   │   └── styles.css
   │   ├── js/
   │   │   ├── gameMain.js
   │   │   ├── state.js
   │   │   ├── config.js
   │   │   ├── utils.js
   │   │   ├── socket.js
   │   │   ├── modals.js
   │   │   ├── wheel.js
   │   │   ├── wheelHandlers.js
   │   │   ├── items.js
   │   │   ├── room.js
   │   │   ├── gameplay.js
   │   │   ├── minigames.js
   │   │   └── ui.js
   │   ├── scripts/
   │   │   ├── grid_generator.py
   │   │   └── map_generator.py
   │   └── images/
   │       └── items/
   │           ├── scoutLens.png
   │           ├── chaosSwap.png
   │           ├── crownCompass.png
   │           ├── thiefsSnare.png
   │           ├── bountyDrop.png
   │           ├── misfortuneCurse.png
   │           ├── closeQuartersHeist.png
   │           ├── wanderingGoblin.png
   │           └── wardingTalisman.png
   ```

## Running the Game

### Local Development
1. Start the server:
   ```bash
   node server.js
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
3. Enter your name (max 20 characters)
4. Either create a new quest or join an existing one with a room code
5. Share the game URL with friends (e.g., `http://localhost:3000/game/abc123xyz`)

### Web Deployment
*(Coming Soon - Will be hosted on a public website for easy access)*

## Navigation Flow

The game uses a multi-page architecture for clean navigation:

1. **`/`** - Name entry page (`name.html`)
   - Enter your player name (stored in browser)
   - Redirects to lobby when complete

2. **`/lobby`** - Room creation and joining (`lobby.html`)
   - Create a new quest with custom options
   - Join an existing quest with a room code
   - Copy and share room codes with friends

3. **`/game/:roomId`** - Active game session (`game.html`)
   - Unique URL for each game room
   - Shareable link for easy invites
   - Automatic reconnection on page refresh
   - Back to lobby button to leave gracefully

4. **`/faq`** - Game documentation (`faq.html`)
   - Opens in new tab (doesn't interrupt gameplay)
   - Comprehensive rules and mechanics

## How to Play

### Setup
1. One player creates a room and shares the game URL or Quest Scroll ID with others
2. Two other players join using the URL or room code
3. Once all 3 players have joined, the game begins automatically

### Game Options
- **Memory Mode**: When enabled, the game log clears at the end of each round
- **Random Start Space**: Randomizes the starting position instead of always using space 12

### Objective
Be the first player to reach the Crown space with at least 5 gold to win!

### Turn Structure
1. **Move or Spin**: On your turn, either move to a connected adjacent space or spin the Shadow Wheel (if trapped)
2. **Resolve Space Effects**: Activate the effect of the space you land on
3. **Use Items** (optional): Use purchased items from your inventory
4. **Buy Items** (optional): Purchase items if on a Shop space or granted access
5. **End Turn**: Click "End Turn" to pass to the next player

### Space Types

| Space Type | Effect |
|------------|--------|
| **Start** | Gain 1 gold |
| **Good** | Spin the Good Wheel (positive effects) |
| **Bad** | Spin the Bad Wheel (negative effects) |
| **Combat** | Spin the Combat Wheel, then all players compete in a mini-game |
| **Shop** | Access to purchase items |
| **Neutral** | No effect |
| **Teleport** | Randomly teleport to a non-adjacent space |
| **Shadow Realm** | Trapped until you spin to escape |
| **Crown** | Win the game if you have 5+ gold |

### Combat Mini-Games

When landing on a Combat space, you spin the Combat Wheel to determine the reward, then all three players compete in one of these mini-games. The winner receives the Combat Wheel reward!

#### 1. Three-Player Tic-Tac-Toe (4x4 Grid)
- Played on a 4x4 board with symbols X, O, and △
- Each player has 3 pieces that can be placed on the board
- When a player has 3 pieces placed, placing a new piece removes their oldest piece
- First player to get 3 in a row (horizontal, vertical, or diagonal) wins
- Only the current player can win on their own turn (prevents kingmaking)

#### 2. Tri-Color Reversi (6x6 Grid)
- 3-player version of Othello on a 6x6 board
- Colors: ⚫ Black, ⚪ White, 🔴 Red (each player starts with 2 tiles in center)
- Modified flipping: When you place a tile, flip any straight line of contiguous tiles of a single color if your tile brackets them
- Game ends when no valid moves remain for all players
- Player with most tiles of their color wins

#### 3. Triple Clash
- 3-player simultaneous betting game
- Each player starts with 5 coins (separate from game gold)
- Each round, all players secretly bet 0-3 coins
- Reveal: Highest unique bet wins the round but loses those coins
- If highest bets are tied, all tied players lose their coins but nobody wins the round
- Players who bet lower keep their coins
- Game ends when all players are out of coins
- Player who won the most rounds wins

### Combat Wheel Rewards
The winner of the mini-game receives one of these rewards:
- **Steal**: Winner steals 2 gold from each opponent
- **Shadow**: All losers are sent to the Shadow Realm
- **Truce**: Winner gets 3 gold, losers get 1 gold each
- **No Effect**: Winner gets 2 gold

### Items

| Item | Cost | Max | Effect |
|------|------|-----|--------|
| **Scout Lens** | 2 gold | ∞ | Reveals all adjacent connected spaces |
| **Chaos Swap** | 4 gold | 2 | Randomly swaps two players' positions |
| **Crown Compass** | 3 gold | 3 | Shows which direction leads closer to the Crown |
| **Thief's Snare** | 3 gold | 2 | Set a trap that steals 2 gold from next player |
| **Bounty Drop** | 2 gold | ∞ | Place 3 gold on a random adjacent space |
| **Misfortune Curse** | 5 gold | 1 | Force a player to lose 2 gold |
| **Close-Quarters Heist** | 4 gold | 2 | Steal 4 gold if sharing a space |
| **Wandering Goblin** | 5 gold | 1 | Spawns a goblin that steals from players |
| **Warding Talisman** | 6 gold | 2 | Protects from one negative effect |

## Game Mechanics

### Movement
- Players can move in 8 directions (N, S, E, W, NE, NW, SE, SW)
- Only connected spaces are available for movement
- Movement options are displayed as a directional grid

### Shadow Realm
- Landing on or being sent to the Shadow Realm traps you
- Each turn in the Shadow Realm, you must spin the Shadow Wheel
- Escape chances increase with each turn spent there (more "Return Home" options)
- If all players are trapped, emergency escape sequence activates

### Traps & Goblins
- Traps persist until triggered by another player (not the owner)
- Goblins move randomly each round for up to 5 rounds
- Both steal gold from players who encounter them
- Players can sell items if they don't have enough gold to pay

### Winning
- First player to reach the Crown space with 5+ gold wins
- Gold must be paid to claim victory
- Game ends and final map is displayed

### Reconnection & Room Persistence
- Players can refresh the page and automatically rejoin their game
- Rooms persist for 5 minutes after all players disconnect
- Navigating between pages doesn't disrupt the game
- Player name is used to identify returning players

## Development Status

### Recently Completed ✅

- **Combat Mini-Games Implementation**: All three mini-games (Tic-Tac-Toe, Reversi, Triple Clash) are fully functional
- **Grid Generation Fix**: Crown connections now properly validate directional uniqueness
- **Map Visualization**: Curved Bezier lines with color coding for non-adjacent connections
- **Mini-Game State Synchronization**: Real-time state updates across all players during mini-games
- **End Game Screens**: Countdown timers and winner displays for all mini-games

### Known Issues & Worries

#### Bugs to Fix
- **Shop Update**: Item quantity in the shop is calculated by a player's inventory so when a player uses an item, it replenishes itself in the shop
- **Shadow Realm Movement**: "Send someone to Shadow Realm" and "Go to Shadow Realm" wheel results need verification
- **Selling System**: Item selling mechanism needs verification and testing

### Planned Features

#### High Priority (Necessary Implementations)
- [x] **Fix Grid Generation**: Prevent invalid Crown connections that violate directional rules ✅ **COMPLETED**
- [x] **Improve Map Readability**: Make non-adjacent connections easier to distinguish ✅ **COMPLETED**
- [x] **Implement Combat Mini-Games**: Code the three combat wheel mini-games ✅ **COMPLETED**
- [ ] **Reimplement Item Quantity Logic in Shop**: Make shop item quantity not dependent on player inventory
- [ ] **Fix Shadow Realm Movement**: Ensure all Shadow Realm teleportation effects work correctly
- [ ] **Verify Selling System**: Test and confirm item selling when players lack gold

#### Medium Priority (Optional Enhancements)
- [ ] **One-Way Connections**: Add 5% chance for one-way connections to increase map complexity
- [ ] **Turn Timer**: Implement 60-second countdown for player turns to maintain game pace
- [ ] **Spectator Mode**: Enable spectating for completed games or waiting players
- [ ] **Room Cleanup**: Implement better room cleanup strategies for abandoned games

#### Low Priority (Quality of Life)
- [ ] **Sound Effects**: Add audio feedback for actions and wheel spins
- [ ] **Animations**: Smooth transitions for player movement and gold changes
- [ ] **Tutorial Mode**: Interactive guide for new players
- [ ] **Game Statistics**: Track wins, games played, and achievement system
- [ ] **Custom Themes**: Alternative visual themes (dark mode, etc.)
- [ ] **Room Browser**: See available public rooms to join

### Testing Checklist
- [ ] **Goblin Movement**: Verify goblins move correctly and steal gold as intended
- [ ] **All Wheel Results**: Test each wheel outcome across all wheel types
- [x] **Combat Mini-Games**: Test all three mini-games for bugs and fairness ✅ **COMPLETED**
- [ ] **Item Effects**: Verify all 9 items work as described
- [ ] **Edge Cases**: Test behavior when multiple players are on same space
- [ ] **Memory Mode**: Confirm log clears properly each round
- [ ] **End Game Conditions**: Test victory condition and map generation
- [ ] **Reconnection**: Test page refresh and URL sharing functionality
- [ ] **Multi-Page Navigation**: Verify all page transitions work smoothly

## Technical Details

### Architecture
- **Backend**: Node.js with Express and Socket.io
- **Frontend**: Vanilla JavaScript (modular design)
- **Grid Generation**: Python script creates procedurally generated maps
- **Map Visualization**: Python matplotlib generates end-game map images
- **Routing**: Multi-page SPA with clean URL structure
- **State Management**: LocalStorage for player persistence, Socket.io for real-time sync

### File Organization
- **Pages**: HTML files in `public/pages/`
- **Styles**: CSS files in `public/css/`
- **Scripts**: JavaScript modules in `public/js/`
- **Python**: Map generation scripts in `public/scripts/`
- **Assets**: Item sprites in `public/images/items/`

### Network Communication
- Real-time multiplayer via WebSocket (Socket.io)
- Room-based game sessions (supports multiple concurrent games)
- State synchronization across all clients
- Automatic reconnection handling with player name matching
- Rooms persist for 5 minutes after disconnect for seamless reconnection
- Mini-game state broadcasting for synchronized gameplay

### URL Structure
- `/` - Name entry
- `/lobby` - Room creation/joining
- `/game/:roomId` - Active game with unique room ID
- `/faq` - Game documentation

### Browser Storage
- `localStorage.playerName` - Player's chosen name
- `localStorage.playerId` - Unique player identifier
- `localStorage.roomId` - Current room identifier

### Browser Compatibility
- Modern browsers with ES6+ support
- WebSocket support required
- Canvas/SVG support for wheel animations
- LocalStorage support required

## Troubleshooting

### Grid Generation Fails
- Ensure Python 3 is installed and in PATH
- Verify `grid_generator.py` is in the `public/scripts/` directory
- Check that matplotlib is installed: `pip install matplotlib`
- If generation times out, try restarting the server
- Test the script manually: `python3 public/scripts/grid_generator.py 12`

### Can't Connect to Game
- Verify server is running on port 3000
- Check firewall settings
- Ensure Socket.io is properly installed
- Try a different browser or clear cache

### Player State Not Syncing
- Refresh the page - it should automatically rejoin
- Check browser console for errors (F12)
- Verify all players are using the same room URL or code
- Ensure stable internet connection
- Check that your player name hasn't changed

### Items Not Displaying
- Verify all item sprite images exist in `public/images/items/`
- Check that image file names match exactly (case-sensitive)
- Clear browser cache and hard reload (Ctrl+Shift+R)
- Ensure images use absolute paths (starting with `/`)

### Mini-Games Not Working
- Check that `minigames.js` is loaded in `game.html`
- Verify all three players are connected
- Check browser console for JavaScript errors
- Ensure Socket.io is properly broadcasting mini-game state
- Try refreshing and rejoining the room

### Room Doesn't Exist Error
- The room may have expired (5-minute timeout after all players leave)
- Create a new room and share the new URL
- Ensure the room creator hasn't closed their browser

### "Back to Lobby" Not Working
- Check browser console for errors
- Ensure server is still running
- Try manually navigating to `/lobby`

## Contributing

This project is in active development. If you encounter bugs or have suggestions:
1. Check the "Known Issues" section above
2. Test if the issue is reproducible
3. Document steps to reproduce
4. Check browser console for error messages

## Credits

A fantasy-themed multiplayer board game built with Node.js, Socket.io, and vanilla JavaScript.

**Technologies Used:**
- Node.js & Express
- Socket.io (Real-time communication)
- Python 3 & Matplotlib (Map generation)
- Vanilla JavaScript (Frontend)
- HTML5 & CSS3
- LocalStorage API

## License

This project is provided as-is for educational and entertainment purposes.

---

**Current Version**: Beta 1.2 (Combat Mini-Games Update)
**Last Updated**: 2025  
**Status**: In Development - Local play available with shareable URLs, mini-games fully functional, web deployment coming soon