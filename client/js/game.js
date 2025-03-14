/**
 * Game manager module for handling game logic
 */
class GameManager {
  constructor() {
    this.playerId = null;
    this.playerName = '';
    this.roomId = null;
    this.isRoomCreator = false;
    this.players = [];
    this.currentRound = 0;
    this.totalRounds = CONFIG.DEFAULT_ROUNDS;
    this.currentDrawer = null;
    this.currentWord = null;
    this.isDrawing = false;
    this.hasGuessedCorrectly = false;
    this.gameState = 'idle'; // idle, lobby, word-selection, drawing, round-end, game-end
    this.canvas = null;
    
    // Bind methods that will be used as callbacks
    this._onDrawEvent = this._onDrawEvent.bind(this);
  }

  /**
   * Initialize the game
   */
  init() {
    // Initialize canvas
    const canvasElement = document.getElementById('drawing-canvas');
    this.canvas = new Canvas(canvasElement, this._onDrawEvent);
    
    // Initialize UI
    ui.init();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Connect to server
    this._connectToServer();
  }

  /**
   * Set up event listeners for UI elements
   * @private
   */
  _setupEventListeners() {
    // Home screen
    ui.createRoomBtn.addEventListener('click', () => this._handleCreateRoom());
    ui.joinRoomBtn.addEventListener('click', () => this._handleJoinRoom());
    
    // Lobby screen
    ui.startGameBtn.addEventListener('click', () => this._handleStartGame());
    ui.leaveRoomBtn.addEventListener('click', () => this._handleLeaveRoom());
    ui.roundsSelect.addEventListener('change', () => this._handleSettingsChange());
    ui.drawTimeSelect.addEventListener('change', () => this._handleSettingsChange());
    
    // Game screen
    ui.clearCanvasBtn.addEventListener('click', () => {
      if (this.isDrawing) {
        this.canvas.clear();
      }
    });
    
    ui.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this._handleChatMessage();
      }
    });
    
    ui.sendChatBtn.addEventListener('click', () => this._handleChatMessage());
    
    // Results screen
    ui.playAgainBtn.addEventListener('click', () => this._handlePlayAgain());
    ui.backToHomeBtn.addEventListener('click', () => this._handleBackToHome());
  }

  /**
   * Connect to the WebSocket server
   * @private
   */
  _connectToServer() {
    socketManager.connect()
      .then(() => {
        console.log('Connected to server');
        this._setupSocketHandlers();
      })
      .catch(error => {
        console.error('Failed to connect to server:', error);
        ui.showNotification('Failed to connect to server. Please try again later.', 5000);
      });
  }

  /**
   * Set up WebSocket message handlers
   * @private
   */
  _setupSocketHandlers() {
    // Connection messages
    socketManager.on(CONFIG.MESSAGE_TYPES.ROOM_CREATED, this._handleRoomCreated.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.ROOM_JOINED, this._handleRoomJoined.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.PLAYER_JOINED, this._handlePlayerJoined.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.PLAYER_LEFT, this._handlePlayerLeft.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.ERROR, this._handleError.bind(this));
    
    // Game state messages
    socketManager.on(CONFIG.MESSAGE_TYPES.GAME_STARTED, this._handleGameStarted.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.TURN_START, this._handleTurnStart.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.WORD_SELECTION, this._handleWordSelection.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.WORD_SELECTED, this._handleWordSelected.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.DRAWING_PHASE, this._handleDrawingPhase.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.TURN_END, this._handleTurnEnd.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.GAME_END, this._handleGameEnd.bind(this));
    
    // Drawing messages
    socketManager.on(CONFIG.MESSAGE_TYPES.DRAW_DATA, this._handleDrawData.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.CLEAR_CANVAS, this._handleClearCanvas.bind(this));
    
    // Chat and guessing messages
    socketManager.on(CONFIG.MESSAGE_TYPES.CHAT_MESSAGE, this._handleIncomingChatMessage.bind(this));
    socketManager.on(CONFIG.MESSAGE_TYPES.CORRECT_GUESS, this._handleCorrectGuess.bind(this));
    
    // Game settings
    socketManager.on(CONFIG.MESSAGE_TYPES.SETTINGS_UPDATED, this._handleSettingsUpdated.bind(this));
  }

  /**
   * Handle create room button click
   * @private
   */
  _handleCreateRoom() {
    const playerName = ui.playerNameInput.value.trim();
    
    if (!playerName) {
      ui.showNotification('Please enter your name');
      return;
    }
    
    this.playerName = playerName;
    
    socketManager.send(CONFIG.MESSAGE_TYPES.CREATE_ROOM, {
      playerName
    });
  }

  /**
   * Handle join room button click
   * @private
   */
  _handleJoinRoom() {
    const playerName = ui.playerNameInput.value.trim();
    const roomCode = ui.roomCodeInput.value.trim().toUpperCase();
    
    if (!playerName) {
      ui.showNotification('Please enter your name');
      return;
    }
    
    if (!roomCode) {
      ui.showNotification('Please enter a room code');
      return;
    }
    
    this.playerName = playerName;
    
    socketManager.send(CONFIG.MESSAGE_TYPES.JOIN_ROOM, {
      playerName,
      roomId: roomCode
    });
  }

  /**
   * Handle room created message from server
   * @private
   * @param {Object} data - Room data
   */
  _handleRoomCreated(data) {
    this.roomId = data.roomId;
    this.playerId = data.playerId;
    this.isRoomCreator = true;
    this.gameState = 'lobby';
    
    // Update UI
    ui.updateRoomInfo({
      id: this.roomId,
      creatorId: this.playerId,
      players: [{ id: this.playerId, name: this.playerName, isCreator: true }],
      settings: {
        rounds: this.totalRounds,
        drawTime: CONFIG.DEFAULT_DRAW_TIME
      }
    });
    
    ui.updatePlayersList([{ id: this.playerId, name: this.playerName, isCreator: true }]);
    ui.showScreen('lobby');
    ui.showNotification('Room created successfully!');
  }

  /**
   * Handle room joined message from server
   * @private
   * @param {Object} data - Room data
   */
  _handleRoomJoined(data) {
    this.roomId = data.roomId;
    this.playerId = data.playerId;
    this.isRoomCreator = data.isCreator;
    this.players = data.players;
    this.gameState = 'lobby';
    
    // Update settings
    if (data.settings) {
      this.totalRounds = data.settings.rounds;
    }
    
    // Update UI
    ui.updateRoomInfo({
      id: this.roomId,
      creatorId: data.creatorId,
      players: this.players,
      settings: data.settings
    });
    
    ui.updatePlayersList(this.players);
    ui.showScreen('lobby');
    ui.showNotification('Joined room successfully!');
  }

  /**
   * Handle player joined message from server
   * @private
   * @param {Object} data - Player data
   */
  _handlePlayerJoined(data) {
    this.players = data.players;
    
    // Update UI
    ui.updateRoomInfo({
      id: this.roomId,
      creatorId: data.creatorId,
      players: this.players,
      settings: data.settings
    });
    
    ui.updatePlayersList(this.players);
    ui.showNotification(`${data.playerName} joined the room`);
  }

  /**
   * Handle player left message from server
   * @private
   * @param {Object} data - Player data
   */
  _handlePlayerLeft(data) {
    this.players = data.players;
    
    // Update UI
    ui.updateRoomInfo({
      id: this.roomId,
      creatorId: data.creatorId,
      players: this.players,
      settings: data.settings
    });
    
    ui.updatePlayersList(this.players);
    
    if (this.gameState !== 'idle') {
      ui.showNotification(`${data.playerName} left the room`);
    }
  }

  /**
   * Handle error message from server
   * @private
   * @param {Object} data - Error data
   */
  _handleError(data) {
    ui.showNotification(data.message, 5000);
  }

  /**
   * Handle start game button click
   * @private
   */
  _handleStartGame() {
    if (this.players.length < CONFIG.MIN_PLAYERS) {
      ui.showNotification(`Need at least ${CONFIG.MIN_PLAYERS} players to start`);
      return;
    }
    
    socketManager.send(CONFIG.MESSAGE_TYPES.GAME_STARTED, {
      roomId: this.roomId
    });
  }

  /**
   * Handle leave room button click
   * @private
   */
  _handleLeaveRoom() {
    // Reset game state
    this.roomId = null;
    this.isRoomCreator = false;
    this.players = [];
    this.gameState = 'idle';
    
    // Return to home screen
    ui.showScreen('home');
    
    // Clear canvas
    this.canvas.clear(false);
  }

  /**
   * Handle settings change
   * @private
   */
  _handleSettingsChange() {
    if (!this.isRoomCreator) return;
    
    const rounds = parseInt(ui.roundsSelect.value);
    const drawTime = parseInt(ui.drawTimeSelect.value);
    
    socketManager.send(CONFIG.MESSAGE_TYPES.UPDATE_SETTINGS, {
      roomId: this.roomId,
      settings: {
        rounds,
        drawTime
      }
    });
  }

  /**
   * Handle settings updated message from server
   * @private
   * @param {Object} data - Settings data
   */
  _handleSettingsUpdated(data) {
    // Update local settings
    this.totalRounds = data.settings.rounds;
    
    // Update UI
    ui.updateRoomInfo({
      id: this.roomId,
      creatorId: data.creatorId,
      players: this.players,
      settings: data.settings
    });
  }

  /**
   * Handle game started message from server
   * @private
   * @param {Object} data - Game data
   */
  _handleGameStarted(data) {
    this.gameState = 'game-started';
    this.currentRound = data.round;
    this.totalRounds = data.totalRounds;
    
    // Update UI
    ui.showScreen('game');
    ui.updateRoundInfo(this.currentRound, this.totalRounds);
    ui.updateScoreboard(data.players);
    ui.clearChat();
    ui.addChatMessage({ system: true, text: 'Game started!' });
    ui.showNotification('Game started!');
  }

  /**
   * Handle turn start message from server
   * @private
   * @param {Object} data - Turn data
   */
  _handleTurnStart(data) {
    this.currentDrawer = data.drawerId;
    this.isDrawing = this.playerId === data.drawerId;
    this.hasGuessedCorrectly = false;
    this.gameState = 'turn-start';
    
    // Clear canvas
    this.canvas.clear(false);
    
    // Update UI
    ui.updateScoreboard(data.players);
    ui.addChatMessage({ 
      system: true, 
      text: `${data.drawerName} is drawing next!` 
    });
    
    // Set up drawing or guessing UI
    if (this.isDrawing) {
      ui.setDrawingToolsEnabled(true);
      ui.setChatEnabled(false, "You're drawing! Others are guessing.");
      this.canvas.setEnabled(true);
    } else {
      ui.setDrawingToolsEnabled(false);
      ui.setChatEnabled(true);
      this.canvas.setEnabled(false);
    }
  }

  /**
   * Handle word selection message from server
   * @private
   * @param {Object} data - Word selection data
   */
  _handleWordSelection(data) {
    this.gameState = 'word-selection';
    
    if (this.isDrawing) {
      // Show word selection UI for drawer
      ui.showWordSelection(data.words, (word, difficulty) => {
        socketManager.send(CONFIG.MESSAGE_TYPES.WORD_SELECTED, {
          roomId: this.roomId,
          word,
          difficulty
        });
      });
    } else {
      // Show waiting message for guessers
      ui.addChatMessage({ 
        system: true, 
        text: 'Waiting for drawer to select a word...' 
      });
      ui.updateWordDisplay('_ _ _ _');
    }
  }

  /**
   * Handle word selected message from server
   * @private
   * @param {Object} data - Word data
   */
  _handleWordSelected(data) {
    this.currentWord = data.word;
    this.gameState = 'word-selected';
    
    // Hide word selection UI if it was showing
    ui.hideWordSelection();
    
    if (this.isDrawing) {
      // Show the word to the drawer
      ui.updateWordDisplay(data.word);
      ui.addChatMessage({ 
        system: true, 
        text: `You are drawing: ${data.word}` 
      });
    } else {
      // Show word length to guessers
      const maskedWord = data.word.replace(/[a-zA-Z]/g, '_ ').trim();
      ui.updateWordDisplay(maskedWord);
      ui.addChatMessage({ 
        system: true, 
        text: `Word has ${data.word.length} letters` 
      });
    }
  }

  /**
   * Handle drawing phase message from server
   * @private
   * @param {Object} data - Drawing phase data
   */
  _handleDrawingPhase(data) {
    this.gameState = 'drawing';
    
    // Start timer
    ui.startTimer(data.drawTime, () => {
      // Timer will be handled by server, this is just for UI
    });
    
    ui.addChatMessage({ 
      system: true, 
      text: 'Drawing has begun!' 
    });
  }

  /**
   * Handle turn end message from server
   * @private
   * @param {Object} data - Turn end data
   */
  _handleTurnEnd(data) {
    this.gameState = 'turn-end';
    
    // Disable drawing
    this.canvas.setEnabled(false);
    ui.setDrawingToolsEnabled(false);
    
    // Update UI
    ui.updateScoreboard(data.players);
    ui.clearTimer();
    
    // Show the word to everyone
    ui.updateWordDisplay(data.word);
    
    ui.addChatMessage({ 
      system: true, 
      text: `The word was: ${data.word}` 
    });
    
    // If no one guessed correctly
    if (data.correctGuessers.length === 0) {
      ui.addChatMessage({ 
        system: true, 
        text: 'No one guessed the word correctly!' 
      });
    }
  }

  /**
   * Handle game end message from server
   * @private
   * @param {Object} data - Game end data
   */
  _handleGameEnd(data) {
    this.gameState = 'game-end';
    
    // Update UI
    ui.updateFinalScoreboard(data.players);
    ui.showScreen('results');
    ui.showNotification('Game over!');
  }

  /**
   * Handle drawing data from server
   * @private
   * @param {Object} data - Drawing data
   */
  _handleDrawData(data) {
    if (this.isDrawing) return; // Ignore if we're the drawer
    
    this.canvas.processDrawData(data.drawData);
  }

  /**
   * Handle clear canvas message from server
   * @private
   */
  _handleClearCanvas() {
    if (this.isDrawing) return; // Ignore if we're the drawer
    
    this.canvas.clear(false);
  }

  /**
   * Handle chat message from UI
   * @private
   */
  _handleChatMessage() {
    const message = ui.chatInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    ui.chatInput.value = '';
    
    // Send message to server
    socketManager.send(CONFIG.MESSAGE_TYPES.CHAT_MESSAGE, {
      roomId: this.roomId,
      message
    });
  }

  /**
   * Handle incoming chat message from server
   * @private
   * @param {Object} data - Chat message data
   */
  _handleIncomingChatMessage(data) {
    ui.addChatMessage({
      playerName: data.playerName,
      text: data.message
    });
  }

  /**
   * Handle correct guess message from server
   * @private
   * @param {Object} data - Correct guess data
   */
  _handleCorrectGuess(data) {
    // Update UI
    ui.addChatMessage({
      correct: true,
      playerName: data.playerName
    });
    
    ui.updateScoreboard(data.players);
    
    // Update local state if this player guessed correctly
    if (data.playerId === this.playerId) {
      this.hasGuessedCorrectly = true;
      ui.setChatEnabled(false, "You've guessed correctly! Wait for the next round.");
    }
  }

  /**
   * Handle play again button click
   * @private
   */
  _handlePlayAgain() {
    if (this.isRoomCreator) {
      // Reset game and return to lobby
      socketManager.send(CONFIG.MESSAGE_TYPES.RESET_GAME, {
        roomId: this.roomId
      });
    } else {
      ui.showNotification('Only the room creator can start a new game');
    }
  }

  /**
   * Handle back to home button click
   * @private
   */
  _handleBackToHome() {
    // Reset game state
    this.roomId = null;
    this.isRoomCreator = false;
    this.players = [];
    this.gameState = 'idle';
    
    // Return to home screen
    ui.showScreen('home');
    
    // Clear canvas
    this.canvas.clear(false);
  }

  /**
   * Handle drawing events from canvas
   * @private
   * @param {Array} drawData - Drawing data
   */
  _onDrawEvent(drawData) {
    if (!this.isDrawing) return;
    
    // Send drawing data to server
    socketManager.send(CONFIG.MESSAGE_TYPES.DRAW_DATA, {
      roomId: this.roomId,
      drawData
    });
  }
}

// Create a singleton instance
const gameManager = new GameManager(); 