const WebSocket = require('ws');
const { handleMessage } = require('./messageHandler');
const { removePlayerFromAllRooms } = require('./roomManager');

/**
 * Set up the WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function setupWebSocketServer(server) {
  // Create WebSocket server
  const wss = new WebSocket.Server({ server });
  
  // Connection event
  wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Assign a unique ID to the connection
    ws.id = Date.now().toString();
    
    // Message event
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        handleMessage(ws, parsedMessage, wss);
      } catch (error) {
        console.error('Error parsing message:', error);
        sendError(ws, 'Invalid message format');
      }
    });
    
    // Close event
    ws.on('close', () => {
      console.log('Client disconnected');
      // Clean up when a client disconnects
      removePlayerFromAllRooms(ws.id);
    });
    
    // Error event
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        message: 'Connected to Draw Something server'
      }
    }));
  });
  
  // Heartbeat to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
  
  return wss;
}

/**
 * Send an error message to a client
 * @param {WebSocket} ws - WebSocket client
 * @param {string} message - Error message
 */
function sendError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: {
        message
      }
    }));
  }
}

module.exports = {
  setupWebSocketServer,
  sendError
}; 