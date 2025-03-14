/**
 * Configuration settings for the Draw Something game
 */
const CONFIG = {
  // Server connection
  SERVER_URL: (() => {
    // Check if we're on localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Determine protocol based on page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // For localhost, use the specific port
    if (isLocalhost) {
      return `ws://localhost:3000`;
    }
    
    // For production, use the appropriate protocol with the current host
    return `${protocol}//${window.location.host}`;
  })(),
  
  // Game settings
  MAX_PLAYERS: 8,
  MIN_PLAYERS: 2,
  DEFAULT_ROUNDS: 3,
  DEFAULT_DRAW_TIME: 90, // seconds
  
  // Drawing settings
  DEFAULT_COLOR: '#000000',
  DEFAULT_BRUSH_SIZE: 5,
  CANVAS_BATCH_INTERVAL: 100, // ms between sending batches of drawing data
  CANVAS_WIDTH: 800, // Fixed canvas width
  CANVAS_HEIGHT: 600, // Fixed canvas height
  
  // Word selection
  WORD_SELECTION_TIME: 15, // seconds
  
  // Difficulty settings
  DIFFICULTY: {
    EASY: {
      label: 'Easy',
      bonus: 0
    },
    MEDIUM: {
      label: 'Medium',
      bonus: 0.25 // 25% bonus
    },
    HARD: {
      label: 'Hard',
      bonus: 0.5 // 50% bonus
    }
  },
  
  // Scoring
  SCORE: {
    FIRST_CORRECT_GUESS: 100,
    SUBSEQUENT_CORRECT_GUESS: 50,
    DRAWER_POINTS_PER_GUESS: 25
  },
  
  // UI settings
  NOTIFICATION_DURATION: 3000, // ms
  TURN_TRANSITION_DELAY: 5000, // ms
  
  // Message types for WebSocket communication
  MESSAGE_TYPES: {
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
    UNDO_CANVAS: 'undo_canvas',
    
    // Chat and guessing messages
    CHAT_MESSAGE: 'chat_message',
    CORRECT_GUESS: 'correct_guess',
    
    // Game settings
    UPDATE_SETTINGS: 'update_settings',
    SETTINGS_UPDATED: 'settings_updated'
  }
}; 