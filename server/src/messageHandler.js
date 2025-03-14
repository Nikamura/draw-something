const WebSocket = require('ws');
const { sendError } = require('./websocket');
const { 
  createRoom, 
  joinRoom, 
  leaveRoom, 
  getRoomById, 
  updateRoomSettings,
  startGame,
  handleWordSelection,
  handleDrawData,
  handleClearCanvas,
  handleChatMessage,
  resetGame
} = require('./roomManager');
const { getRandomWords } = require('./wordManager');

// Fallback sendError function in case the import fails
const localSendError = (ws, message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message
      }
    }));
  }
};

// Use the imported sendError if available, otherwise use the local one
const errorHandler = sendError || localSendError;

// Message types
const MESSAGE_TYPES = {
  // Connection messages
  JOIN_ROOM: 'join_room',
  CREATE_ROOM: 'create_room',
  ROOM_JOINED: 'room_joined',
  ROOM_CREATED: 'room_created',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  ERROR: 'error',
  
  // Game state messages
  GAME_STARTED: 'game_started',
  TURN_START: 'turn_start',
  WORD_SELECTION: 'word_selection',
  WORD_SELECTED: 'word_selected',
  DRAWING_PHASE: 'drawing_phase',
  TURN_END: 'turn_end',
  GAME_END: 'game_end',
  
  // Drawing messages
  DRAW_DATA: 'draw_data',
  CLEAR_CANVAS: 'clear_canvas',
  
  // Chat and guessing messages
  CHAT_MESSAGE: 'chat_message',
  CORRECT_GUESS: 'correct_guess',
  
  // Game settings
  UPDATE_SETTINGS: 'update_settings',
  SETTINGS_UPDATED: 'settings_updated',
  
  // Game reset
  RESET_GAME: 'reset_game'
};

/**
 * Handle incoming WebSocket messages
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} message - Parsed message
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleMessage(ws, message, wss) {
  const { type, payload } = message;
  
  console.log(`Received message type: ${type}`);
  
  switch (type) {
    case MESSAGE_TYPES.CREATE_ROOM:
      handleCreateRoom(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.JOIN_ROOM:
      handleJoinRoom(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.GAME_STARTED:
      handleGameStarted(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.WORD_SELECTED:
      handleWordSelected(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.DRAW_DATA:
      handleDrawDataMessage(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.CLEAR_CANVAS:
      handleClearCanvasMessage(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.CHAT_MESSAGE:
      handleChatMessageReceived(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.UPDATE_SETTINGS:
      handleUpdateSettings(ws, payload, wss);
      break;
      
    case MESSAGE_TYPES.RESET_GAME:
      handleResetGame(ws, payload, wss);
      break;
      
    default:
      errorHandler(ws, `Unknown message type: ${type}`);
  }
}

/**
 * Handle create room message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleCreateRoom(ws, payload, wss) {
  const { playerName } = payload;
  
  if (!playerName) {
    return errorHandler(ws, 'Player name is required');
  }
  
  const { roomId, playerId } = createRoom(ws, playerName);
  
  // Store player ID in WebSocket object for reference
  ws.playerId = playerId;
  
  // Send room created message to client
  ws.send(JSON.stringify({
    type: MESSAGE_TYPES.ROOM_CREATED,
    payload: {
      roomId,
      playerId
    }
  }));
}

/**
 * Handle join room message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleJoinRoom(ws, payload, wss) {
  const { playerName, roomId } = payload;
  
  console.log(`Handling join room request: ${playerName} trying to join ${roomId}`);
  
  if (!playerName || !roomId) {
    console.log('Missing playerName or roomId in join request');
    return errorHandler(ws, 'Player name and room ID are required');
  }
  
  try {
    const result = joinRoom(ws, roomId, playerName);
    
    if (!result) {
      console.log('Join room failed: No result returned');
      return errorHandler(ws, 'Failed to join room');
    }
    
    const { playerId, room } = result;
    
    // Store player ID in WebSocket object for reference
    ws.playerId = playerId;
    
    // Create the response payload
    const responsePayload = {
      roomId,
      playerId,
      isCreator: room.creatorId === playerId,
      creatorId: room.creatorId,
      players: room.players,
      settings: room.settings
    };
    
    console.log(`Sending ROOM_JOINED message to client with payload:`, responsePayload);
    
    // Send room joined message to client
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ROOM_JOINED,
      payload: responsePayload
    }));
    
    console.log(`Notifying other players in room ${roomId} about new player ${playerName}`);
    
    // Notify other players in the room
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.PLAYER_JOINED,
      payload: {
        playerName,
        playerId,
        creatorId: room.creatorId,
        players: room.players,
        settings: room.settings
      }
    }, [ws.id]);
  } catch (error) {
    console.log(`Error joining room: ${error.message}`);
    errorHandler(ws, error.message);
  }
}

/**
 * Handle game started message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleGameStarted(ws, payload, wss) {
  const { roomId } = payload;
  
  if (!roomId) {
    return errorHandler(ws, 'Room ID is required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the room creator can start the game
    if (room.creatorId !== ws.playerId) {
      return errorHandler(ws, 'Only the room creator can start the game');
    }
    
    // Start the game
    const gameState = startGame(roomId);
    
    // Broadcast game started message to all players in the room
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.GAME_STARTED,
      payload: {
        round: gameState.currentRound,
        totalRounds: gameState.totalRounds,
        players: gameState.players
      }
    });
    
    // Start the first turn after a short delay
    setTimeout(() => {
      startNextTurn(wss, roomId);
    }, 2000);
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle word selected message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleWordSelected(ws, payload, wss) {
  const { roomId, word, difficulty } = payload;
  
  if (!roomId || !word) {
    return errorHandler(ws, 'Room ID and word are required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the current drawer can select a word
    if (room.gameState.currentDrawer !== ws.playerId) {
      return errorHandler(ws, 'Only the current drawer can select a word');
    }
    
    // Handle word selection
    handleWordSelection(roomId, word, difficulty);
    
    // Send word selected message to drawer
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.WORD_SELECTED,
      payload: {
        word
      }
    }));
    
    // Send masked word to other players
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.WORD_SELECTED,
      payload: {
        word: '_'.repeat(word.length)
      }
    }, [ws.id]);
    
    // Start drawing phase
    setTimeout(() => {
      const room = getRoomById(roomId);
      if (room) {
        // Broadcast drawing phase message to all players
        broadcastToRoom(wss, roomId, {
          type: MESSAGE_TYPES.DRAWING_PHASE,
          payload: {
            drawTime: room.settings.drawTime
          }
        });
        
        // Set timer to end the turn
        room.gameState.turnTimer = setTimeout(() => {
          endTurn(wss, roomId);
        }, room.settings.drawTime * 1000);
      }
    }, 1000);
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle draw data message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleDrawDataMessage(ws, payload, wss) {
  const { roomId, drawData } = payload;
  
  if (!roomId || !drawData) {
    return errorHandler(ws, 'Room ID and draw data are required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the current drawer can send draw data
    if (room.gameState.currentDrawer !== ws.playerId) {
      return errorHandler(ws, 'Only the current drawer can draw');
    }
    
    // Handle draw data
    handleDrawData(roomId, drawData);
    
    // Broadcast draw data to other players
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.DRAW_DATA,
      payload: {
        drawData
      }
    }, [ws.id]);
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle clear canvas message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleClearCanvasMessage(ws, payload, wss) {
  const { roomId } = payload;
  
  if (!roomId) {
    return errorHandler(ws, 'Room ID is required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the current drawer can clear the canvas
    if (room.gameState.currentDrawer !== ws.playerId) {
      return errorHandler(ws, 'Only the current drawer can clear the canvas');
    }
    
    // Handle clear canvas
    handleClearCanvas(roomId);
    
    // Broadcast clear canvas to other players
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.CLEAR_CANVAS
    }, [ws.id]);
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle chat message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleChatMessageReceived(ws, payload, wss) {
  const { roomId, message } = payload;
  
  if (!roomId || !message) {
    return errorHandler(ws, 'Room ID and message are required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Get player from room
    const player = room.players.find(p => p.id === ws.playerId);
    
    if (!player) {
      return errorHandler(ws, 'Player not found in room');
    }
    
    // Check if player is the current drawer
    if (room.gameState.currentDrawer === ws.playerId) {
      return errorHandler(ws, 'The drawer cannot send chat messages during their turn');
    }
    
    // Check if player has already guessed correctly
    if (room.gameState.correctGuessers.includes(ws.playerId)) {
      // Just broadcast the message without checking for correct guess
      broadcastToRoom(wss, roomId, {
        type: MESSAGE_TYPES.CHAT_MESSAGE,
        payload: {
          playerName: player.name,
          playerId: player.id,
          message
        }
      });
      return;
    }
    
    // Handle chat message and check if it's a correct guess
    const isCorrectGuess = handleChatMessage(roomId, ws.playerId, message);
    
    if (isCorrectGuess) {
      // Get updated room state
      const updatedRoom = getRoomById(roomId);
      
      // Broadcast correct guess message
      broadcastToRoom(wss, roomId, {
        type: MESSAGE_TYPES.CORRECT_GUESS,
        payload: {
          playerName: player.name,
          playerId: player.id,
          players: updatedRoom.players
        }
      });
      
      // Check if all players have guessed correctly
      const allPlayersGuessedCorrectly = updatedRoom.players.every(p => 
        p.id === updatedRoom.gameState.currentDrawer || 
        updatedRoom.gameState.correctGuessers.includes(p.id)
      );
      
      if (allPlayersGuessedCorrectly) {
        // End the turn early if all players have guessed correctly
        clearTimeout(updatedRoom.gameState.turnTimer);
        updatedRoom.gameState.turnTimer = setTimeout(() => {
          endTurn(wss, roomId);
        }, 2000);
      }
    } else {
      // Broadcast regular chat message
      broadcastToRoom(wss, roomId, {
        type: MESSAGE_TYPES.CHAT_MESSAGE,
        payload: {
          playerName: player.name,
          playerId: player.id,
          message
        }
      });
    }
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle update settings message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleUpdateSettings(ws, payload, wss) {
  const { roomId, settings } = payload;
  
  if (!roomId || !settings) {
    return errorHandler(ws, 'Room ID and settings are required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the room creator can update settings
    if (room.creatorId !== ws.playerId) {
      return errorHandler(ws, 'Only the room creator can update settings');
    }
    
    // Update room settings
    updateRoomSettings(roomId, settings);
    
    // Broadcast settings updated message
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: {
        creatorId: room.creatorId,
        settings: room.settings
      }
    });
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Handle reset game message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} payload - Message payload
 * @param {WebSocket.Server} wss - WebSocket server
 */
function handleResetGame(ws, payload, wss) {
  const { roomId } = payload;
  
  if (!roomId) {
    return errorHandler(ws, 'Room ID is required');
  }
  
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      return errorHandler(ws, 'Room not found');
    }
    
    // Only the room creator can reset the game
    if (room.creatorId !== ws.playerId) {
      return errorHandler(ws, 'Only the room creator can reset the game');
    }
    
    // Reset the game
    resetGame(roomId);
    
    // Broadcast reset game message
    broadcastToRoom(wss, roomId, {
      type: 'game_reset',
      payload: {
        players: room.players
      }
    });
  } catch (error) {
    errorHandler(ws, error.message);
  }
}

/**
 * Start the next turn in a game
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {string} roomId - Room ID
 */
function startNextTurn(wss, roomId) {
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      console.error('Room not found');
      return;
    }
    
    // Check if the game is over
    if (room.gameState.currentRound > room.settings.rounds) {
      // End the game
      broadcastToRoom(wss, roomId, {
        type: MESSAGE_TYPES.GAME_END,
        payload: {
          players: room.players
        }
      });
      return;
    }
    
    // Get the next drawer
    const nextDrawerIndex = room.gameState.currentTurnIndex % room.players.length;
    const nextDrawer = room.players[nextDrawerIndex];
    
    // Update game state
    room.gameState.currentDrawer = nextDrawer.id;
    room.gameState.currentTurnIndex++;
    room.gameState.correctGuessers = [];
    room.gameState.word = null;
    
    // Mark player as drawing
    room.players.forEach(player => {
      player.isDrawing = player.id === nextDrawer.id;
    });
    
    // Broadcast turn start message
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.TURN_START,
      payload: {
        drawerId: nextDrawer.id,
        drawerName: nextDrawer.name,
        players: room.players,
        currentRound: room.gameState.currentRound,
        totalRounds: room.settings.rounds
      }
    });
    
    // Generate word options for the drawer
    const wordOptions = getRandomWords();
    
    // Send word selection message to drawer
    const drawerClient = findClientById(wss, nextDrawer.id);
    
    if (drawerClient) {
      drawerClient.send(JSON.stringify({
        type: MESSAGE_TYPES.WORD_SELECTION,
        payload: {
          words: wordOptions
        }
      }));
      
      // Set a timer for word selection
      room.gameState.wordSelectionTimer = setTimeout(() => {
        // Auto-select a random word if the drawer doesn't select one
        if (!room.gameState.word) {
          const randomIndex = Math.floor(Math.random() * wordOptions.length);
          const randomWord = wordOptions[randomIndex];
          
          handleWordSelected(drawerClient, {
            roomId,
            word: randomWord.word,
            difficulty: randomWord.difficulty
          }, wss);
        }
      }, 15000); // 15 seconds for word selection
    }
    
    // Send waiting message to other players
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.WORD_SELECTION,
      payload: {
        words: []
      }
    }, [nextDrawer.id]);
  } catch (error) {
    console.error('Error starting next turn:', error);
  }
}

/**
 * End the current turn
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {string} roomId - Room ID
 */
function endTurn(wss, roomId) {
  try {
    const room = getRoomById(roomId);
    
    if (!room) {
      console.error('Room not found');
      return;
    }
    
    // Broadcast turn end message
    broadcastToRoom(wss, roomId, {
      type: MESSAGE_TYPES.TURN_END,
      payload: {
        word: room.gameState.word,
        correctGuessers: room.gameState.correctGuessers,
        players: room.players
      }
    });
    
    // Check if we need to advance to the next round
    if (room.gameState.currentTurnIndex % room.players.length === 0) {
      room.gameState.currentRound++;
    }
    
    // Start the next turn after a delay
    room.gameState.turnTimer = setTimeout(() => {
      startNextTurn(wss, roomId);
    }, 5000); // 5 seconds between turns
  } catch (error) {
    console.error('Error ending turn:', error);
  }
}

/**
 * Generate word options for the drawer
 * @returns {Array} Array of word options
 */
function generateWordOptions() {
  return getRandomWords();
}

/**
 * Broadcast a message to all clients in a room
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {string} roomId - Room ID
 * @param {Object} message - Message to broadcast
 * @param {Array} excludeClientIds - Array of client IDs to exclude
 */
function broadcastToRoom(wss, roomId, message, excludeClientIds = []) {
  const room = getRoomById(roomId);
  
  if (!room) {
    console.error('Room not found');
    return;
  }
  
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && 
        room.players.some(p => p.id === client.playerId) && 
        !excludeClientIds.includes(client.id)) {
      client.send(messageString);
    }
  });
}

/**
 * Find a client by player ID
 * @param {WebSocket.Server} wss - WebSocket server
 * @param {string} playerId - Player ID
 * @returns {WebSocket|null} WebSocket client or null if not found
 */
function findClientById(wss, playerId) {
  let foundClient = null;
  
  wss.clients.forEach(client => {
    if (client.playerId === playerId) {
      foundClient = client;
    }
  });
  
  return foundClient;
}

module.exports = {
  handleMessage,
  MESSAGE_TYPES
}; 