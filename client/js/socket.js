/**
 * Socket module for handling WebSocket communication
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.messageHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
  }

  /**
   * Connect to the WebSocket server
   * @returns {Promise} Resolves when connection is established
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(CONFIG.SERVER_URL);
        
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          this._handleMessage(event);
        };
        
        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.connected = false;
          this._attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket server:', error);
        reject(error);
      }
    });
  }

  /**
   * Register a handler for a specific message type
   * @param {string} messageType - The type of message to handle
   * @param {Function} handler - The handler function
   */
  on(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

  /**
   * Send a message to the server
   * @param {string} type - Message type
   * @param {Object} payload - Message data
   */
  send(type, payload = {}) {
    if (!this.connected) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    const message = JSON.stringify({
      type,
      payload
    });
    
    try {
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.socket && this.connected) {
      this.socket.close();
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @private
   * @param {MessageEvent} event - The WebSocket message event
   */
  _handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const { type, payload } = message;
      
      if (this.messageHandlers[type]) {
        this.messageHandlers[type].forEach(handler => {
          try {
            handler(payload);
          } catch (error) {
            console.error(`Error in handler for message type '${type}':`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   * @private
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection attempt failed:', error);
      });
    }, delay);
  }
}

// Create a singleton instance
const socketManager = new SocketManager(); 