# Draw Something - Drawing and Guessing Game

A real-time multiplayer drawing and guessing game inspired by Pictionary. One player draws a word while others try to guess it.

## Development Approach

This project has been entirely "vibe coded" - all code, documentation, and assets have been generated using Cursor IDE with Claude 3.7 Sonnet AI assistance. This represents an experiment in AI-assisted development, where the entire codebase was created through collaborative prompting and iterative refinement with AI.

## Project Structure

```
/
├── server/         # Server-side code
│   ├── src/        # Server source code
│   ├── data/       # Word lists and game data
│   └── package.json # Server dependencies
├── client/         # Client-side code
│   ├── js/         # JavaScript files
│   ├── css/        # CSS styles
│   ├── assets/     # Images and other assets
│   └── index.html  # Main HTML file
```

## Features

### Core Functionality
- Real-time WebSocket communication between client and server
- Room-based multiplayer system with unique room IDs
- Complete game flow with turn management
- Dynamic screen management (home, lobby, game screens)
- Responsive design for various device sizes

### Drawing Tools
- Canvas-based drawing system with different brush sizes
- Multiple color options for drawing
- Fill tool for coloring areas
- Undo functionality for drawing mistakes
- Real-time drawing updates for all players

### Game Mechanics
- Word selection with difficulty levels (Easy, Medium, Hard)
- Random word selection from word pools
- Timer system for different game phases
- Scoring system based on correct guesses and word difficulty
- Close guess detection with visual feedback
- Previous drawings gallery to view past artwork

### User Interface
- Chat system for guessing and communication
- Scroll-to-bottom button for chat navigation
- Visual indicators for game state and turn information
- Game settings management for room creators
- Disabled settings indicators for non-room creators
- Mobile-friendly layout adjustments

## Game Rules

### Room Management
- Rooms have unique IDs
- Maximum players per room: 8
- Minimum players to start a game: 2
- Room creator can configure game settings
- Game settings can only be modified by the room creator

### Turn Management
- Turns proceed in the order players joined
- Each turn has phases: word selection, drawing, guessing
- Time limits: 
  - Word selection: 15 seconds
  - Drawing: 60/90/120 seconds (Easy/Medium/Hard)
  - Between turns: 5 seconds
- Turn timers are managed server-side for consistency

### Scoring System
- First correct guess: 100 points
- Subsequent correct guesses: 50 points
- Drawer gets 25 points per correct guess
- Bonus points for difficult words
  - Easy: no bonus
  - Medium: 25% bonus
  - Hard: 50% bonus

### Word Selection
- Drawer chooses from 3 options (Easy, Medium, Hard)
- Words are organized by difficulty level in the UI
- Words should not repeat in the same game session
- If drawer doesn't select in time, a random word is chosen
- Used words are reset for new games

### Guessing Rules
- Guesses are not case sensitive
- Close matches are detected and provide feedback to the player
- Typing the exact word is required for a correct match
- Players cannot guess during their drawing turn
- All guesses are visible in the chat

## Technical Implementation

### Client-Side Architecture
The client-side code is organized into several modules:

- **app.js**: Main entry point
- **config.js**: Configuration settings
- **socket.js**: WebSocket communication
- **ui.js**: User interface management
- **canvas.js**: Drawing functionality
- **game.js**: Game logic

### Communication Protocol
- WebSockets for real-time communication
- JSON format for all messages
- Message queuing for handling offline scenarios
- Optimized network traffic by batching drawing events

### Drawing Implementation
- Canvas-based drawing system
- Incremental drawing updates
- Support for different brush sizes and colors
- Fill tool for coloring areas
- Undo functionality with drawing history

### Performance Optimization
- Minimized DOM updates
- requestAnimationFrame for animations
- Debouncing for frequent events
- Optimized WebSocket message size
- Fixed canvas dimensions for consistent drawing experience

## Running the Application

### Client
1. Clone the repository
2. Open `client/index.html` in a web browser
3. For development without a server, add `?offline=true` to the URL

### Server (When Implemented)
1. Navigate to the server directory: `cd server`
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Server will run on the configured port (default: 3000)

## Technologies Used

- HTML5 Canvas for drawing
- WebSockets for real-time communication
- Vanilla JavaScript (no frameworks)
- CSS3 for styling
- Node.js for server-side implementation

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Workflow
- Run tests before committing
- Use feature branches
- Document API changes
- Keep the README updated

## License

MIT 