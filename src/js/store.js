import { wordData, difficultySettings, dailyChallengeWords } from './data.js';

const initialState = {
    gameMode: 'classic', // 'classic', 'timedRush', 'daily'
    selectedWord: '',
    selectedCategory: '',
    selectedDifficulty: {},
    correctLetters: [],
    wrongGuessCount: 0,
    currentScore: 0,
    timedRushStreak: 0,
    highScore: 0,
    dailyStreak: 0,
    bestStreak: 0,
    isMuted: false,
    gameStats: { played: 0, wins: 0 },
    timerId: null,
    hasInteracted: false,
    dailyCountdownInterval: null,
    timedRushInterval: null,
    timeLeft: 0,
};

function gameReducer(state = initialState, action) {
    switch (action.type) {
        case 'START_GAME':
            return {
                ...state,
                gameMode: 'classic',
                hasInteracted: true,
                currentScore: 0,
            };
        case 'START_DAILY_CHALLENGE':
            return {
                ...state,
                hasInteracted: true,
                gameMode: 'daily',
                selectedCategory: 'Daily Challenge',
                selectedDifficulty: difficultySettings.hard,
                selectedWord: action.payload.word,
            };
        case 'START_TIMED_RUSH':
            return {
                ...state,
                hasInteracted: true,
                gameMode: 'timedRush',
                currentScore: 0,
                timedRushStreak: 0,
                selectedDifficulty: difficultySettings.medium, // Or a specific setting for this mode
                timedRushInterval: action.payload.intervalId,
            };
        case 'SET_CATEGORY':
            return { ...state, selectedCategory: action.payload.category };
        case 'SET_DIFFICULTY':
            return {
                ...state,
                selectedDifficulty: difficultySettings[action.payload.level],
                selectedWord: wordData[state.selectedCategory].words[action.payload.wordIndex],
            };
        case 'SET_NEW_TIMED_RUSH_WORD':
            return {
                ...state,
                selectedWord: action.payload.word,
            };
        case 'INITIALIZE_ROUND':
            return {
                ...state,
                correctLetters: [],
                wrongGuessCount: 0,
            };
        case 'CORRECT_GUESS':
            return {
                ...state,
                correctLetters: [...state.correctLetters, action.payload.letter],
            };
        case 'INCREMENT_TIMED_RUSH_STREAK':
            return {
                ...state,
                timedRushStreak: state.timedRushStreak + 1,
            };
        case 'RESET_TIMED_RUSH_STREAK':
            return { ...state, timedRushStreak: 0 };
        case 'INCORRECT_GUESS':
            return { ...state, wrongGuessCount: state.wrongGuessCount + 1 };
        case 'SET_TIMER':
            return { ...state, timerId: action.payload.timerId };
        case 'END_GAME':
            return {
                ...state,
                timedRushInterval: state.gameMode === 'timedRush' ? state.timedRushInterval : null,
                timerId: null,
                gameStats: action.payload.gameStats,
                dailyStreak: action.payload.dailyStreak,
                bestStreak: action.payload.bestStreak,
                currentScore: action.payload.currentScore,
                highScore: action.payload.highScore,
            };
        case 'LOAD_SAVED_DATA':
            return {
                ...state,
                highScore: action.payload.highScore,
                dailyStreak: action.payload.dailyStreak,
                bestStreak: action.payload.bestStreak,
                gameStats: action.payload.gameStats,
            };
        case 'SET_MUTE':
            return { ...state, isMuted: action.payload.isMuted };
        case 'RESET_STATS':
            return { ...state, gameStats: { played: 0, wins: 0 } };
        default:
            return state;
    }
}

function createStore(reducer) {
    let state;
    const listeners = [];

    const getState = () => state;

    const dispatch = (action) => {
        state = reducer(state, action);
        listeners.forEach(listener => listener());
    };

    const subscribe = (listener) => {
        listeners.push(listener);
        return function unsubscribe() {
            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
        };
    };

    dispatch({ type: '@@INIT' }); // Initialize state

    return { getState, dispatch, subscribe };
}

export const store = createStore(gameReducer);