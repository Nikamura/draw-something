/**
 * Main application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure only home screen is active at startup
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  const homeScreen = document.getElementById('home-screen');
  if (homeScreen) {
    homeScreen.classList.add('active');
  }
  
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