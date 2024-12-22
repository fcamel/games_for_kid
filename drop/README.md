# Math Drop Game

A fun and interactive math game where players solve math expressions to clear falling rectangles. Play alone or challenge a friend in multiplayer mode!

## Features

### Game Modes
- **Single Player**: Practice your math skills at your own pace
- **Multiplayer**: Challenge another player in real-time
  - When you clear rectangles, your opponent gets extra ones
  - First player to let rectangles reach the top loses

### Gameplay
- Math expressions drop from the top of the screen
- Type the correct answer using the on-screen number pad or keyboard
- Special rectangles (gold) create combo effects when cleared
- Attack rectangles (blue border) appear when your opponent clears rectangles

### Controls
- **Number Pad**: Click or touch numbers to input answers
- **Keyboard**: Type numbers and press Enter
- **Clear (C)**: Clear current input
- **Enter (⏎)**: Submit answer

### Settings
- Adjust drop speed (0.1x to 3x)
- Control special rectangle frequency (0% to 50%)

### Touch Support
- Optimized for tablets and touch devices
- Responsive number pad
- Fast touch response

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Start the server:
```bash
python server.py
```

3. Open `index.html` in your browser:
   - For single player: Just play!
   - For multiplayer: Open in two different browsers or devices

## Technical Requirements

- Python 3.7+
- FastAPI
- Uvicorn
- WebSocket support

## Browser Support
- Works on modern browsers (Chrome, Firefox, Safari)
- Optimized for desktop and tablet devices
- Touch-friendly interface

## Development

The game consists of:
- `index.html`: Game interface and client-side logic
- `server.py`: WebSocket server for multiplayer support
- `requirements.txt`: Python dependencies

## Tips

1. **Single Player**
   - Great for practice
   - Adjust speed to match your skill level
   - Try to beat your high score

2. **Multiplayer**
   - Clear rectangles quickly to send attacks
   - Watch for blue attack rectangles from your opponent
   - Special rectangles create bigger attacks

3. **Special Rectangles**
   - Gold rectangles clear nearby rectangles when solved
   - Creates combo effects for higher scores
   - In multiplayer, sends more attacks to opponent
