const fs = require('fs');
const path = require('path');

// Word lists by difficulty
let easyWords = [];
let mediumWords = [];
let hardWords = [];

// Track used words to prevent repetition
let usedWords = new Set();

/**
 * Load word lists from files
 * @returns {Object} Word lists by difficulty
 */
function loadWordList() {
  try {
    // Try to load word lists from files
    const easyWordsPath = path.join(__dirname, '../data/easy_words.txt');
    const mediumWordsPath = path.join(__dirname, '../data/medium_words.txt');
    const hardWordsPath = path.join(__dirname, '../data/hard_words.txt');
    
    if (!fs.existsSync(easyWordsPath)) {
      throw new Error(`Easy words file not found: ${easyWordsPath}`);
    }
    
    if (!fs.existsSync(mediumWordsPath)) {
      throw new Error(`Medium words file not found: ${mediumWordsPath}`);
    }
    
    if (!fs.existsSync(hardWordsPath)) {
      throw new Error(`Hard words file not found: ${hardWordsPath}`);
    }
    
    easyWords = fs.readFileSync(easyWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    mediumWords = fs.readFileSync(mediumWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    hardWords = fs.readFileSync(hardWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    
    if (easyWords.length === 0) {
      throw new Error('Easy words file is empty');
    }
    
    if (mediumWords.length === 0) {
      throw new Error('Medium words file is empty');
    }
    
    if (hardWords.length === 0) {
      throw new Error('Hard words file is empty');
    }
    
    console.log(`Loaded word lists: ${easyWords.length} easy, ${mediumWords.length} medium, ${hardWords.length} hard`);
  } catch (error) {
    console.error('Error loading word lists:', error);
    throw error; // Re-throw the error instead of using default words
  }
  
  return {
    easy: easyWords,
    medium: mediumWords,
    hard: hardWords
  };
}

/**
 * Get a random word from a list, avoiding previously used words
 * @param {Array} wordList - List of words to choose from
 * @returns {string} Random word
 */
function getRandomWordFromList(wordList) {
  // Filter out used words
  const availableWords = wordList.filter(word => !usedWords.has(word));
  
  // If all words have been used, reset the used words tracking
  if (availableWords.length === 0) {
    console.log('All words have been used, resetting used words tracking');
    usedWords.clear();
    return wordList[Math.floor(Math.random() * wordList.length)];
  }
  
  // Get a random word from available words
  const word = availableWords[Math.floor(Math.random() * availableWords.length)];
  
  // Add to used words
  usedWords.add(word);
  
  return word;
}

/**
 * Get random words for each difficulty level
 * @returns {Array} Array of words [3 easy, 3 medium, 3 hard]
 */
function getRandomWords() {
  // Make sure word lists are loaded
  if (easyWords.length === 0 || mediumWords.length === 0 || hardWords.length === 0) {
    loadWordList();
  }
  
  // Get 3 random words from each difficulty
  const easyOptions = [];
  const mediumOptions = [];
  const hardOptions = [];
  
  // Get 3 easy words
  for (let i = 0; i < 3; i++) {
    easyOptions.push(getRandomWordFromList(easyWords));
  }
  
  // Get 3 medium words
  for (let i = 0; i < 3; i++) {
    mediumOptions.push(getRandomWordFromList(mediumWords));
  }
  
  // Get 3 hard words
  for (let i = 0; i < 3; i++) {
    hardOptions.push(getRandomWordFromList(hardWords));
  }
  
  // Return all 9 words with their difficulty levels
  return [
    ...easyOptions.map(word => ({ word, difficulty: 'easy' })),
    ...mediumOptions.map(word => ({ word, difficulty: 'medium' })),
    ...hardOptions.map(word => ({ word, difficulty: 'hard' }))
  ];
}

/**
 * Reset used words tracking (useful when starting a new game)
 */
function resetUsedWords() {
  usedWords.clear();
  console.log('Reset used words tracking');
}

// Load word lists on startup
loadWordList();

module.exports = {
  loadWordList,
  getRandomWords,
  resetUsedWords
}; 