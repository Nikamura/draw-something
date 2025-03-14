const fs = require('fs');
const path = require('path');

// Word lists by difficulty
let easyWords = [];
let mediumWords = [];
let hardWords = [];

// Default word lists if files are not available
const DEFAULT_EASY_WORDS = [
  'dog', 'cat', 'house', 'tree', 'car', 'sun', 'moon', 'fish', 'book', 'chair',
  'ball', 'apple', 'bird', 'baby', 'hat', 'door', 'shoe', 'eye', 'egg', 'boat',
  'clock', 'star', 'cup', 'key', 'hand', 'foot', 'bed', 'nose', 'mouth', 'ear'
];

const DEFAULT_MEDIUM_WORDS = [
  'airplane', 'elephant', 'computer', 'bicycle', 'mountain', 'rainbow', 'guitar', 'pizza', 'castle', 'robot',
  'butterfly', 'octopus', 'hamburger', 'penguin', 'dinosaur', 'telescope', 'cactus', 'tornado', 'dolphin', 'kangaroo',
  'umbrella', 'volcano', 'scarecrow', 'lighthouse', 'waterfall', 'snowman', 'pirate', 'cowboy', 'mermaid', 'dragon'
];

const DEFAULT_HARD_WORDS = [
  'skyscraper', 'astronaut', 'submarine', 'orchestra', 'helicopter', 'rhinoceros', 'escalator', 'microscope', 'parachute', 'trampoline',
  'firefighter', 'vegetarian', 'electricity', 'refrigerator', 'celebration', 'imagination', 'thermometer', 'skateboard', 'binoculars', 'caterpillar',
  'constellation', 'photographer', 'cheerleader', 'rollercoaster', 'kaleidoscope', 'surveillance', 'extraterrestrial', 'procrastination', 'independence', 'photosynthesis'
];

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
    
    if (fs.existsSync(easyWordsPath)) {
      easyWords = fs.readFileSync(easyWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    } else {
      easyWords = [...DEFAULT_EASY_WORDS];
    }
    
    if (fs.existsSync(mediumWordsPath)) {
      mediumWords = fs.readFileSync(mediumWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    } else {
      mediumWords = [...DEFAULT_MEDIUM_WORDS];
    }
    
    if (fs.existsSync(hardWordsPath)) {
      hardWords = fs.readFileSync(hardWordsPath, 'utf8').split('\n').filter(word => word.trim() !== '');
    } else {
      hardWords = [...DEFAULT_HARD_WORDS];
    }
    
    console.log(`Loaded word lists: ${easyWords.length} easy, ${mediumWords.length} medium, ${hardWords.length} hard`);
  } catch (error) {
    console.error('Error loading word lists:', error);
    
    // Use default word lists
    easyWords = [...DEFAULT_EASY_WORDS];
    mediumWords = [...DEFAULT_MEDIUM_WORDS];
    hardWords = [...DEFAULT_HARD_WORDS];
    
    console.log('Using default word lists');
  }
  
  return {
    easy: easyWords,
    medium: mediumWords,
    hard: hardWords
  };
}

/**
 * Get random words for each difficulty level
 * @returns {Array} Array of words [easy, medium, hard]
 */
function getRandomWords() {
  // Make sure word lists are loaded
  if (easyWords.length === 0 || mediumWords.length === 0 || hardWords.length === 0) {
    loadWordList();
  }
  
  // Get random words
  const easy = easyWords[Math.floor(Math.random() * easyWords.length)];
  const medium = mediumWords[Math.floor(Math.random() * mediumWords.length)];
  const hard = hardWords[Math.floor(Math.random() * hardWords.length)];
  
  return [easy, medium, hard];
}

// Load word lists on startup
loadWordList();

module.exports = {
  loadWordList,
  getRandomWords
}; 