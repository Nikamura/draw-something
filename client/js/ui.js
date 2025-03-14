/**
 * UI module for handling user interface interactions
 */
class UI {
  constructor() {
    // Screen elements
    this.screens = {
      home: document.getElementById('home-screen'),
      lobby: document.getElementById('lobby-screen'),
      game: document.getElementById('game-screen'),
      results: document.getElementById('results-screen')
    };
    
    // Log screen elements for debugging
    console.log('UI constructor - screen elements:', {
      home: this.screens.home,
      lobby: this.screens.lobby,
      game: this.screens.game,
      results: this.screens.results
    });
    
    // Home screen elements
    this.playerNameInput = document.getElementById('player-name');
    this.createRoomBtn = document.getElementById('create-room-btn');
    this.roomCodeInput = document.getElementById('room-code');
    this.joinRoomBtn = document.getElementById('join-room-btn');
    
    // Lobby screen elements
    this.roomIdDisplay = document.getElementById('room-id');
    this.shareCodeDisplay = document.getElementById('share-code');
    this.copyCodeBtn = document.getElementById('copy-code-btn');
    this.playersList = document.getElementById('players-list');
    this.roundsSelect = document.getElementById('rounds-select');
    this.drawTimeSelect = document.getElementById('draw-time-select');
    this.startGameBtn = document.getElementById('start-game-btn');
    this.leaveRoomBtn = document.getElementById('leave-room-btn');
    
    // Game screen elements
    this.currentRoundDisplay = document.getElementById('current-round');
    this.totalRoundsDisplay = document.getElementById('total-rounds');
    this.timerDisplay = document.getElementById('timer');
    this.timerProgress = document.getElementById('timer-progress');
    this.wordDisplay = document.getElementById('word-display');
    this.wordSelection = document.getElementById('word-selection');
    this.wordOptions = document.querySelectorAll('.word-option');
    this.colorOptions = document.querySelectorAll('.color-option');
    this.brushOptions = document.querySelectorAll('.brush-option');
    this.clearCanvasBtn = document.getElementById('clear-canvas');
    this.scoreboardList = document.getElementById('scoreboard-list');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendChatBtn = document.getElementById('send-chat-btn');
    
    // Results screen elements
    this.finalScoreboard = document.getElementById('final-scoreboard');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.backToHomeBtn = document.getElementById('back-to-home-btn');
    
    // Notification element
    this.notification = document.getElementById('notification');
    
    // Timer related properties
    this.timerInterval = null;
    this.timerEndTime = 0;
  }

  /**
   * Initialize UI event listeners
   */
  init() {
    // Test button for debugging
    const testLobbyBtn = document.getElementById('test-lobby-btn');
    if (testLobbyBtn) {
      testLobbyBtn.addEventListener('click', () => {
        console.log('Test button clicked, showing lobby screen');
        this.showScreen('lobby');
      });
    }
    
    // Copy room code button
    this.copyCodeBtn.addEventListener('click', () => {
      const roomCode = this.shareCodeDisplay.textContent;
      navigator.clipboard.writeText(roomCode)
        .then(() => this.showNotification('Room code copied to clipboard!'))
        .catch(err => console.error('Failed to copy room code:', err));
    });
    
    // Color picker
    this.colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const color = option.getAttribute('data-color');
        if (gameManager && gameManager.canvas) {
          gameManager.canvas.setColor(color);
        }
      });
    });
    
    // Brush size
    this.brushOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.brushOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const size = parseInt(option.getAttribute('data-size'));
        if (gameManager && gameManager.canvas) {
          gameManager.canvas.setBrushSize(size);
        }
      });
    });
  }

  /**
   * Show a specific screen and hide others
   * @param {string} screenName - Name of the screen to show
   */
  showScreen(screenName) {
    console.log(`UI.showScreen called with screenName: ${screenName}`);
    console.trace('showScreen call stack');
    
    Object.keys(this.screens).forEach(key => {
      this.screens[key].classList.remove('active');
    });
    
    console.log('screens:', this.screens);
    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
      console.log(`Screen ${screenName} is now active`);
    } else {
      console.error(`Screen ${screenName} not found in this.screens:`, this.screens);
    }
  }

  /**
   * Display a notification message
   * @param {string} message - The message to display
   * @param {number} [duration=3000] - How long to show the notification in ms
   */
  showNotification(message, duration = CONFIG.NOTIFICATION_DURATION) {
    this.notification.textContent = message;
    this.notification.classList.add('show');
    
    setTimeout(() => {
      this.notification.classList.remove('show');
    }, duration);
  }

  /**
   * Update the room information in the lobby
   * @param {Object} roomData - Room information
   */
  updateRoomInfo(roomData) {
    this.roomIdDisplay.textContent = roomData.id;
    this.shareCodeDisplay.textContent = roomData.id;
    
    // Update settings if available
    if (roomData.settings) {
      this.roundsSelect.value = roomData.settings.rounds;
      this.drawTimeSelect.value = roomData.settings.drawTime;
    }
    
    // Enable start button if enough players and user is room creator
    if (roomData.players.length >= CONFIG.MIN_PLAYERS && roomData.creatorId === gameManager.playerId) {
      this.startGameBtn.disabled = false;
    } else {
      this.startGameBtn.disabled = true;
    }
  }

  /**
   * Update the players list in the lobby
   * @param {Array} players - List of players in the room
   */
  updatePlayersList(players) {
    this.playersList.innerHTML = '';
    
    players.forEach(player => {
      const li = document.createElement('li');
      li.textContent = player.name;
      
      if (player.isCreator) {
        const creatorBadge = document.createElement('span');
        creatorBadge.textContent = '👑';
        creatorBadge.style.marginLeft = '5px';
        li.appendChild(creatorBadge);
      }
      
      this.playersList.appendChild(li);
    });
  }

  /**
   * Update the scoreboard during the game
   * @param {Array} players - List of players with scores
   */
  updateScoreboard(players) {
    this.scoreboardList.innerHTML = '';
    
    // Sort players by score (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach(player => {
      const li = document.createElement('li');
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = player.name;
      
      // Add indicator if player is currently drawing
      if (player.isDrawing) {
        const drawingIcon = document.createElement('span');
        drawingIcon.textContent = ' ✏️';
        nameSpan.appendChild(drawingIcon);
      }
      
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = player.score;
      
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      this.scoreboardList.appendChild(li);
    });
  }

  /**
   * Update the final scoreboard on the results screen
   * @param {Array} players - List of players with final scores
   */
  updateFinalScoreboard(players) {
    this.finalScoreboard.innerHTML = '';
    
    // Sort players by score (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach((player, index) => {
      const li = document.createElement('li');
      
      const rankNameSpan = document.createElement('span');
      
      // Add medal emoji for top 3
      if (index === 0) {
        rankNameSpan.textContent = `🥇 ${player.name}`;
      } else if (index === 1) {
        rankNameSpan.textContent = `🥈 ${player.name}`;
      } else if (index === 2) {
        rankNameSpan.textContent = `🥉 ${player.name}`;
      } else {
        rankNameSpan.textContent = `${index + 1}. ${player.name}`;
      }
      
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = player.score;
      
      li.appendChild(rankNameSpan);
      li.appendChild(scoreSpan);
      this.finalScoreboard.appendChild(li);
    });
  }

  /**
   * Display word selection options
   * @param {Array} words - List of words to choose from
   * @param {Function} onSelect - Callback when a word is selected
   */
  showWordSelection(words, onSelect) {
    this.wordSelection.classList.remove('hidden');
    
    // Set word options
    this.wordOptions.forEach((option, index) => {
      const difficulty = option.getAttribute('data-difficulty');
      option.textContent = words[index];
      
      // Clear previous event listeners
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);
      
      // Add new event listener
      newOption.addEventListener('click', () => {
        onSelect(words[index], difficulty);
        this.wordSelection.classList.add('hidden');
      });
    });
    
    // Start word selection timer
    this.startTimer(CONFIG.WORD_SELECTION_TIME, () => {
      // Auto-select first word if time runs out
      onSelect(words[0], 'easy');
      this.wordSelection.classList.add('hidden');
    });
  }

  /**
   * Hide word selection
   */
  hideWordSelection() {
    this.wordSelection.classList.add('hidden');
  }

  /**
   * Update the word display for guessers
   * @param {string} word - The word to display (or masked version)
   */
  updateWordDisplay(word) {
    this.wordDisplay.textContent = word;
  }

  /**
   * Start a timer with countdown
   * @param {number} seconds - Duration in seconds
   * @param {Function} onComplete - Callback when timer completes
   */
  startTimer(seconds, onComplete) {
    // Clear any existing timer
    this.clearTimer();
    
    const startTime = Date.now();
    this.timerEndTime = startTime + (seconds * 1000);
    
    // Update timer immediately
    this._updateTimerDisplay(seconds);
    
    // Set up interval to update timer
    this.timerInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((this.timerEndTime - Date.now()) / 1000));
      
      this._updateTimerDisplay(remaining);
      
      if (remaining <= 0) {
        this.clearTimer();
        if (onComplete) onComplete();
      }
    }, 100);
  }

  /**
   * Clear the active timer
   */
  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update the timer display
   * @private
   * @param {number} seconds - Remaining seconds
   */
  _updateTimerDisplay(seconds) {
    this.timerDisplay.textContent = seconds;
    
    // Update progress bar
    const totalDuration = (this.timerEndTime - Date.now()) / 1000 + seconds;
    const percentRemaining = (seconds / totalDuration) * 100;
    this.timerProgress.style.width = `${percentRemaining}%`;
    
    // Change color based on time remaining
    if (seconds <= 5) {
      this.timerProgress.style.backgroundColor = '#dc3545'; // Red
    } else if (seconds <= 15) {
      this.timerProgress.style.backgroundColor = '#ffc107'; // Yellow
    } else {
      this.timerProgress.style.backgroundColor = '#4a6ee0'; // Blue (primary color)
    }
  }

  /**
   * Add a chat message
   * @param {Object} message - Message data
   */
  addChatMessage(message) {
    const messageElement = document.createElement('div');
    
    if (message.system) {
      // System message
      messageElement.classList.add('system-message');
      messageElement.textContent = message.text;
    } else if (message.correct) {
      // Correct guess
      messageElement.classList.add('correct-guess');
      messageElement.textContent = `${message.playerName} guessed the word!`;
    } else {
      // Regular chat message
      messageElement.classList.add('chat-message');
      
      const nameSpan = document.createElement('span');
      nameSpan.classList.add('player-name');
      nameSpan.textContent = message.playerName + ':';
      
      messageElement.appendChild(nameSpan);
      messageElement.appendChild(document.createTextNode(' ' + message.text));
    }
    
    this.chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  /**
   * Clear all chat messages
   */
  clearChat() {
    this.chatMessages.innerHTML = '';
  }

  /**
   * Enable or disable drawing tools
   * @param {boolean} enabled - Whether tools should be enabled
   */
  setDrawingToolsEnabled(enabled) {
    this.colorOptions.forEach(option => {
      option.style.pointerEvents = enabled ? 'auto' : 'none';
      option.style.opacity = enabled ? '1' : '0.5';
    });
    
    this.brushOptions.forEach(option => {
      option.disabled = !enabled;
      option.style.opacity = enabled ? '1' : '0.5';
    });
    
    this.clearCanvasBtn.disabled = !enabled;
  }

  /**
   * Enable or disable chat input
   * @param {boolean} enabled - Whether chat should be enabled
   * @param {string} [placeholder] - Optional placeholder text
   */
  setChatEnabled(enabled, placeholder) {
    this.chatInput.disabled = !enabled;
    
    if (placeholder) {
      this.chatInput.placeholder = placeholder;
    } else {
      this.chatInput.placeholder = enabled ? 'Type your guess here...' : 'Waiting for your turn...';
    }
    
    this.sendChatBtn.disabled = !enabled;
  }

  /**
   * Update round information
   * @param {number} currentRound - Current round number
   * @param {number} totalRounds - Total number of rounds
   */
  updateRoundInfo(currentRound, totalRounds) {
    this.currentRoundDisplay.textContent = currentRound;
    this.totalRoundsDisplay.textContent = totalRounds;
  }
}

// Create a singleton instance
const ui = new UI(); 