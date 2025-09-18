// DOM Elements
export const dom = {
    screens: {
        intro: document.getElementById('intro-screen'),
        category: document.getElementById('category-screen'),
        difficulty: document.getElementById('difficulty-screen'),
        game: document.getElementById('game-screen'),
    },
    gameContentWrapper: document.querySelector('.game-content-wrapper'),
    wordDisplay: document.querySelector('.word-display'),
    keyboardDiv: document.querySelector('.keyboard'),
    categoryButtonsDiv: document.getElementById('category-buttons-container'),
    categoryHintSpan: document.getElementById('category-hint'),
    hangmanParts: document.querySelectorAll('#game-screen .figure-part'),
    modalContainer: document.getElementById('modal-container'),
    highScoreSpan: document.getElementById('high-score'),
    dailyStreakSpan: document.getElementById('daily-streak'),
    currentScoreSpan: document.getElementById('current-score'),
    startGameBtn: document.getElementById('start-game-btn'),
    quitGameBtn: document.getElementById('quit-game-btn'),
    dailyChallengeBtn: document.getElementById('daily-challenge-btn'),
    dailyChallengeBtnText: document.getElementById('daily-challenge-btn').querySelector('.btn-text'),
    backToIntroBtn: document.getElementById('back-to-intro-btn'),
    backToCategoryBtn: document.getElementById('back-to-category-btn'),
    dailyPlayedModalContainer: document.getElementById('daily-played-modal-container'),
    closeDailyPlayedBtn: document.getElementById('close-daily-played-btn'),
    dailyCountdown: document.getElementById('daily-countdown'),
    difficultyButtonsDiv: document.getElementById('difficulty-buttons'),
    confirmModalContainer: document.getElementById('confirm-modal-container'),
    confirmQuitBtn: document.getElementById('confirm-quit-btn'),
    cancelQuitBtn: document.getElementById('cancel-quit-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    settingsModalContainer: document.getElementById('settings-modal-container'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    howToPlayBtn: document.getElementById('how-to-play-btn'),
    tutorialModalContainer: document.getElementById('tutorial-modal-container'),
    statsBtn: document.getElementById('stats-btn'),
    statsModalContainer: document.getElementById('stats-modal-container'),
    resetStatsBtn: document.getElementById('reset-stats-btn'),
    closeStatsBtn: document.getElementById('close-stats-btn'),
    closeTutorialBtn: document.getElementById('close-tutorial-btn'),
    muteBtn: document.getElementById('mute-btn'),
    volumeSlider: document.getElementById('volume-slider'),
    timerSpan: document.getElementById('timer'),
    hintButton: document.getElementById('hint-button'),
    revealWordBtn: document.getElementById('reveal-word-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    gameOverModalContent: document.getElementById('game-over-modal-content'),
};

// Game Data
export const wordData = {
    programming: { words: ['javascript', 'interface', 'developer', 'element', 'function', 'variable', 'algorithm'], icon: '💻' },
    animals: { words: ['elephant', 'giraffe', 'penguin', 'crocodile', 'hippopotamus', 'chimpanzee', 'rhinoceros'], icon: '🐘' },
    countries: { words: ['switzerland', 'australia', 'brazil', 'canada', 'denmark', 'egypt', 'argentina'], icon: '🌍' },
    food: { words: ['spaghetti', 'broccoli', 'strawberry', 'pineapple', 'chocolate', 'avocado', 'pancake'], icon: '🍔' },
    science: { words: ['astronomy', 'chemistry', 'genetics', 'molecule', 'photosynthesis', 'gravity', 'galaxy'], icon: '🔬' },
    sports: { words: ['basketball', 'volleyball', 'gymnastics', 'badminton', 'archery', 'fencing', 'cricket'], icon: '🏀' }
};

export const difficultySettings = {
    easy:   { time: 120, hints: true, icon: '😊' },
    medium: { time: 90,  hints: true, icon: '🤔' },
    hard:   { time: 60,  hints: false, icon: '💀' }
};

export const dailyChallengeWords = [
    'synergy', 'paradigm', 'juxtaposition', 'quixotic', 'ephemeral', 'mnemonic', 'ubiquitous',
    'zeitgeist', 'ambiguous', 'boulevard', 'chrysanthemum', 'conscientious', 'dichotomy'
];

// Game State
const state = {
    selectedWord: '',
    selectedCategory: '',
    selectedDifficulty: {},
    correctLetters: [],
    wrongGuessCount: 0,
    currentScore: 0,
    highScore: 0,
    dailyStreak: 0,
    bestStreak: 0,
    isMuted: false,
    gameStats: { played: 0, wins: 0 },
    timerId: null,
    hasInteracted: false,
    dailyCountdownInterval: null,
    timeLeft: 0,
};

// We export a function to get the state, but not to set it directly from outside.
// Modules that need to modify state will have specific functions to do so.
export function getState() {
    return state;
}

// Export specific setters for state properties that need to be changed from other modules
export function setGameState(newState) {
    Object.assign(state, newState);
}