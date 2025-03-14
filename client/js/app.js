/**
 * Main application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the game
  gameManager.init();
  
  // Show loading message while connecting to server
  ui.showNotification('Connecting to server...');
  
  // Handle offline mode for development
  if (window.location.search.includes('offline=true')) {
    console.log('Running in offline mode');
    
    // Mock server connection
    setTimeout(() => {
      ui.showNotification('Connected in offline mode');
    }, 1000);
  }
  
  // Log initialization
  console.log('Draw Something game initialized');
}); 