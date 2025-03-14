const { v4: uuidv4 } = require('uuid');
const { loadWordList, resetUsedWords } = require('./wordManager');

// In-memory storage for rooms
const rooms = new Map();

// Default settings
const DEFAULT_SETTINGS = {
  rounds: 3,
  drawTime: 90
};

/**
 * Create a new room
 * @param {WebSocket} ws - WebSocket client
 * @param {string} playerName - Player name
 * @returns {Object} Room and player IDs
 */
function createRoom(ws, playerName) {
  // Generate room ID (6 characters alphanumeric)
  const roomId = generateRoomId();
  const playerId = uuidv4();
  
  // Create player object
  const player = {
    id: playerId,
    name: playerName,
    score: 0,
    isCreator: true,
    isDrawing: false,
    connectionId: ws.id
  };
  
  // Create room object
  const room = {
    id: roomId,
    creatorId: playerId,
    players: [player],
    settings: { ...DEFAULT_SETTINGS },
    gameState: {
      isActive: false,
      currentRound: 0,
      totalRounds: DEFAULT_SETTINGS.rounds,
      currentTurnIndex: 0,
      currentDrawer: null,
      word: null,
      correctGuessers: [],
      drawData: [],
      turnTimer: null,
      wordSelectionTimer: null
    }
  };
  
  // Store room
  rooms.set(roomId, room);
  
  console.log(`Room created: ${roomId}`);
  
  return { roomId, playerId };
}

/**
 * Join an existing room
 * @param {WebSocket} ws - WebSocket client
 * @param {string} roomId - Room ID
 * @param {string} playerName - Player name
 * @returns {Object} Room and player data
 */
function joinRoom(ws, roomId, playerName) {
  console.log(`Attempting to join room ${roomId} with player ${playerName}`);
  
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    console.log(`Room ${roomId} not found`);
    throw new Error('Room not found');
  }
  
  // Check if game is already in progress
  if (room.gameState.isActive) {
    console.log(`Game in room ${roomId} is already in progress`);
    throw new Error('Game already in progress');
  }
  
  // Check if room is full
  if (room.players.length >= 8) {
    console.log(`Room ${roomId} is full`);
    throw new Error('Room is full');
  }
  
  // Check if player name is already taken in this room
  if (room.players.some(p => p.name === playerName)) {
    console.log(`Player name ${playerName} already taken in room ${roomId}`);
    throw new Error('Player name already taken in this room');
  }
  
  // Generate player ID
  const playerId = uuidv4();
  
  // Create player object
  const player = {
    id: playerId,
    name: playerName,
    score: 0,
    isCreator: false,
    isDrawing: false,
    connectionId: ws.id
  };
  
  // Add player to room
  room.players.push(player);
  
  console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`);
  console.log(`Room ${roomId} now has ${room.players.length} players`);
  
  return { playerId, room };
}

/**
 * Leave a room
 * @param {string} roomId - Room ID
 * @param {string} playerId - Player ID
 */
function leaveRoom(roomId, playerId) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    return false;
  }
  
  // Find player index
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) {
    return false;
  }
  
  // Get player name for logging
  const playerName = room.players[playerIndex].name;
  
  // Remove player from room
  room.players.splice(playerIndex, 1);
  
  console.log(`Player ${playerName} left room ${roomId}`);
  
  // If room is empty, delete it
  if (room.players.length === 0) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted (empty)`);
    return true;
  }
  
  // If the player was the creator, assign a new creator
  if (room.creatorId === playerId && room.players.length > 0) {
    room.creatorId = room.players[0].id;
    room.players[0].isCreator = true;
    console.log(`New creator assigned in room ${roomId}: ${room.players[0].name}`);
  }
  
  // If the player was the current drawer, end the turn
  if (room.gameState.isActive && room.gameState.currentDrawer === playerId) {
    // Clear any timers
    if (room.gameState.turnTimer) {
      clearTimeout(room.gameState.turnTimer);
    }
    
    if (room.gameState.wordSelectionTimer) {
      clearTimeout(room.gameState.wordSelectionTimer);
    }
    
    // End the turn
    room.gameState.currentTurnIndex++;
    
    // If there are not enough players, end the game
    if (room.players.length < 2) {
      room.gameState.isActive = false;
      console.log(`Game ended in room ${roomId} (not enough players)`);
    }
  }
  
  return true;
}

/**
 * Remove a player from all rooms
 * @param {string} connectionId - WebSocket connection ID
 */
function removePlayerFromAllRooms(connectionId) {
  // Iterate through all rooms
  for (const [roomId, room] of rooms.entries()) {
    // Find player with matching connection ID
    const player = room.players.find(p => p.connectionId === connectionId);
    
    if (player) {
      // Leave the room
      leaveRoom(roomId, player.id);
    }
  }
}

/**
 * Get a room by ID
 * @param {string} roomId - Room ID
 * @returns {Object|null} Room object or null if not found
 */
function getRoomById(roomId) {
  return rooms.get(roomId) || null;
}

/**
 * Update room settings
 * @param {string} roomId - Room ID
 * @param {Object} settings - New settings
 */
function updateRoomSettings(roomId, settings) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Update settings
  room.settings = {
    ...room.settings,
    ...settings
  };
  
  // Update game state if needed
  if (settings.rounds) {
    room.gameState.totalRounds = settings.rounds;
  }
  
  console.log(`Settings updated for room ${roomId}`);
  
  return room.settings;
}

/**
 * Start a game in a room
 * @param {string} roomId - Room ID
 * @returns {Object} Game state
 */
function startGame(roomId) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Check if there are enough players
  if (room.players.length < 2) {
    throw new Error('Not enough players to start the game');
  }
  
  // Reset player scores
  room.players.forEach(player => {
    player.score = 0;
    player.isDrawing = false;
  });
  
  // Reset used words for the new game
  resetUsedWords();
  
  // Initialize game state
  room.gameState = {
    isActive: true,
    currentRound: 1,
    totalRounds: room.settings.rounds,
    currentTurnIndex: 0,
    currentDrawer: null,
    word: null,
    correctGuessers: [],
    drawData: [],
    turnTimer: null,
    wordSelectionTimer: null
  };
  
  console.log(`Game started in room ${roomId}`);
  
  return {
    currentRound: room.gameState.currentRound,
    totalRounds: room.gameState.totalRounds,
    players: room.players
  };
}

/**
 * Handle word selection
 * @param {string} roomId - Room ID
 * @param {string} word - Selected word
 * @param {string} difficulty - Word difficulty
 */
function handleWordSelection(roomId, word, difficulty) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Clear word selection timer
  if (room.gameState.wordSelectionTimer) {
    clearTimeout(room.gameState.wordSelectionTimer);
    room.gameState.wordSelectionTimer = null;
  }
  
  // Set the word
  room.gameState.word = word;
  room.gameState.difficulty = difficulty || 'easy';
  
  console.log(`Word selected in room ${roomId}: ${word} (${difficulty})`);
  
  return true;
}

/**
 * Handle drawing data
 * @param {string} roomId - Room ID
 * @param {Array} drawData - Drawing data
 */
function handleDrawData(roomId, drawData) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Add draw data to game state
  room.gameState.drawData.push(...drawData);
  
  return true;
}

/**
 * Handle clear canvas
 * @param {string} roomId - Room ID
 */
function handleClearCanvas(roomId) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Clear draw data
  room.gameState.drawData = [];
  
  console.log(`Canvas cleared in room ${roomId}`);
  
  return true;
}

/**
 * Handle chat message and check for correct guess
 * @param {string} roomId - Room ID
 * @param {string} playerId - Player ID
 * @param {string} message - Chat message
 * @returns {Object} Result with isCorrectGuess and isCloseGuess flags
 */
function handleChatMessage(roomId, playerId, message) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Check if game is active
  if (!room.gameState.isActive) {
    return { isCorrectGuess: false, isCloseGuess: false };
  }
  
  // Check if there's a current word
  if (!room.gameState.word) {
    return { isCorrectGuess: false, isCloseGuess: false };
  }
  
  // Check if player is the drawer
  if (room.gameState.currentDrawer === playerId) {
    return { isCorrectGuess: false, isCloseGuess: false };
  }
  
  // Check if player has already guessed correctly
  if (room.gameState.correctGuessers.includes(playerId)) {
    return { isCorrectGuess: false, isCloseGuess: false };
  }
  
  const normalizedMessage = message.toLowerCase().trim();
  const normalizedWord = room.gameState.word.toLowerCase().trim();
  
  // Check if message is a correct guess (case insensitive)
  const isCorrectGuess = normalizedMessage === normalizedWord;
  
  // Check for close guesses
  let isCloseGuess = false;
  
  if (!isCorrectGuess) {
    // Check for singular/plural forms
    if (normalizedMessage + 's' === normalizedWord || normalizedWord + 's' === normalizedMessage) {
      isCloseGuess = true;
    } 
    // Check for simple typos using Levenshtein distance
    else if (normalizedMessage.length > 3 && levenshteinDistance(normalizedMessage, normalizedWord) <= 2) {
      isCloseGuess = true;
    }
  }
  
  if (isCorrectGuess) {
    // Add player to correct guessers
    room.gameState.correctGuessers.push(playerId);
    
    // Update scores
    const player = room.players.find(p => p.id === playerId);
    const drawer = room.players.find(p => p.id === room.gameState.currentDrawer);
    
    if (player && drawer) {
      // First correct guess gets more points
      if (room.gameState.correctGuessers.length === 1) {
        player.score += 100;
      } else {
        player.score += 50;
      }
      
      // Drawer gets points for each correct guess
      drawer.score += 25;
      
      // Apply difficulty bonus
      const difficultyBonus = getDifficultyBonus(room.gameState.difficulty);
      if (difficultyBonus > 0) {
        const bonusPoints = Math.floor(player.score * difficultyBonus);
        player.score += bonusPoints;
        
        const drawerBonusPoints = Math.floor(25 * difficultyBonus);
        drawer.score += drawerBonusPoints;
      }
    }
    
    console.log(`Correct guess in room ${roomId} by player ${playerId}`);
  }
  
  return { isCorrectGuess, isCloseGuess };
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - The edit distance between the strings
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Reset a game
 * @param {string} roomId - Room ID
 */
function resetGame(roomId) {
  // Check if room exists
  const room = rooms.get(roomId);
  
  if (!room) {
    throw new Error('Room not found');
  }
  
  // Clear any timers
  if (room.gameState.turnTimer) {
    clearTimeout(room.gameState.turnTimer);
  }
  
  if (room.gameState.wordSelectionTimer) {
    clearTimeout(room.gameState.wordSelectionTimer);
  }
  
  // Reset game state
  room.gameState = {
    isActive: false,
    currentRound: 0,
    totalRounds: room.settings.rounds,
    currentTurnIndex: 0,
    currentDrawer: null,
    word: null,
    correctGuessers: [],
    drawData: [],
    turnTimer: null,
    wordSelectionTimer: null
  };
  
  // Reset player scores and drawing status
  room.players.forEach(player => {
    player.score = 0;
    player.isDrawing = false;
  });
  
  console.log(`Game reset in room ${roomId}`);
  
  return true;
}

/**
 * Generate a random room ID
 * @returns {string} Room ID
 */
function generateRoomId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // Check if ID already exists
  if (rooms.has(result)) {
    return generateRoomId(); // Try again
  }
  
  return result;
}

/**
 * Get difficulty bonus multiplier
 * @param {string} difficulty - Difficulty level
 * @returns {number} Bonus multiplier
 */
function getDifficultyBonus(difficulty) {
  switch (difficulty) {
    case 'medium':
      return 0.25; // 25% bonus
    case 'hard':
      return 0.5; // 50% bonus
    default:
      return 0; // No bonus for easy
  }
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  removePlayerFromAllRooms,
  getRoomById,
  updateRoomSettings,
  startGame,
  handleWordSelection,
  handleDrawData,
  handleClearCanvas,
  handleChatMessage,
  resetGame
}; 