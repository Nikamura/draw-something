# Draw Something - Drawing and Guessing Game

A real-time multiplayer drawing and guessing game inspired by Pictionary. One player draws a word while others try to guess it.

## Project Structure

```
/
├── client/         # Client-side code
│   ├── js/         # JavaScript files
│   ├── css/        # CSS styles
│   └── assets/     # Images and other assets
├── server/         # Server-side code (to be implemented)
```

## Features

- Real-time drawing with WebSockets
- Multiple game rooms
- Customizable game settings
- Word selection with difficulty levels
- Scoring system
- Chat for guessing
- Responsive design

## Game Rules

### Room Management
- Rooms have unique IDs
- Maximum players per room: 8
- Minimum players to start a game: 2
- Room creator can configure game settings

### Turn Management
- Turns proceed in the order players joined
- Each turn has phases: word selection, drawing, guessing
- Time limits: 
  - Word selection: 15 seconds
  - Drawing: 60/90/120 seconds (Easy/Medium/Hard)
  - Between turns: 5 seconds

### Scoring System
- First correct guess: 100 points
- Subsequent correct guesses: 50 points
- Drawer gets 25 points per correct guess
- Bonus points for difficult words
  - Easy: no bonus
  - Medium: 25% bonus
  - Hard: 50% bonus

## Client-Side Implementation

The client-side code is organized into several modules:

- **app.js**: Main entry point
- **config.js**: Configuration settings
- **socket.js**: WebSocket communication
- **ui.js**: User interface management
- **canvas.js**: Drawing functionality
- **game.js**: Game logic

## Running the Client

1. Clone the repository
2. Open `client/index.html` in a web browser
3. For development without a server, add `?offline=true` to the URL

## Server Implementation (Coming Soon)

The server-side implementation will be added in a future update. It will handle:

- Room management
- Game state
- Word selection
- Scoring
- WebSocket communication

## Technologies Used

- HTML5 Canvas for drawing
- WebSockets for real-time communication
- Vanilla JavaScript (no frameworks)
- CSS3 for styling

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT 