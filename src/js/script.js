import { dom } from './state.js';
import { store } from './store.js';
import { playClickSound, setVolume, toggleMute } from './audio.js';
import { showScreen, createCategoryButtons, createDifficultyButtons, resetFigure, displayStats, updateScoreDisplay, updateDailyStreakDisplay } from './ui.js';
import { initializeGame, handleGuess, endGame, startTimedRushMode } from './game.js';
import { showModal, hideModal, initializeModal } from './modal.js';
import { startDailyChallenge, updateDailyChallengeButtonState } from './dailyChallenge.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- INITIALIZATION ---
    function init() {
        // Load from localStorage
        const savedHighScore = parseInt(localStorage.getItem('hangmanHighScore')) || 0;
        const savedDailyStreak = parseInt(localStorage.getItem('dailyChallengeStreak')) || 0;
        const savedBestStreak = parseInt(localStorage.getItem('hangmanBestStreak')) || 0;
        const savedGameStats = JSON.parse(localStorage.getItem('hangmanStats')) || { played: 0, wins: 0 };
        const savedVolume = localStorage.getItem('hangmanVolume') || 1;
        const savedMuteState = localStorage.getItem('hangmanMuted') === 'true';
        const savedTheme = localStorage.getItem('hangmanTheme');

        store.dispatch({ type: 'LOAD_SAVED_DATA', payload: {
            highScore: savedHighScore,
            dailyStreak: savedDailyStreak,
            bestStreak: savedBestStreak,
            gameStats: savedGameStats,
        }});

        // UI Updates
        updateScoreDisplay(0, store.getState().highScore);
        updateDailyStreakDisplay(savedDailyStreak);
        createCategoryButtons();
        createDifficultyButtons();
        resetFigure();
        updateDailyChallengeButtonState();

        // Settings
        setVolume(savedVolume);
        toggleMute(savedMuteState);

        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            dom.themeToggle.checked = true;
        }

        showScreen('intro');
        initializeModal();
    }

    // --- EVENT LISTENERS ---
    dom.startGameBtn.addEventListener('click', () => {
        playClickSound();
        store.dispatch({ type: 'START_GAME' });
        updateScoreDisplay(0, store.getState().highScore);
        showScreen('category');
    });

    dom.dailyChallengeBtn.addEventListener('click', () => {
        playClickSound();
        store.dispatch({ type: 'START_DAILY_CHALLENGE', payload: { word: startDailyChallenge() } });
        startDailyChallenge();
    });

    dom.timedRushBtn.addEventListener('click', () => {
        playClickSound();
        startTimedRushMode();
        showScreen('game');
    });

    dom.quitGameBtn.addEventListener('click', () => {
        playClickSound();
        showModal('confirm');
    });

    dom.backToIntroBtn.addEventListener('click', () => {
        playClickSound();
        showScreen('intro');
    });

    dom.backToCategoryBtn.addEventListener('click', () => {
        playClickSound();
        showScreen('category');
    });

    dom.hintButton.addEventListener('click', () => {
        playClickSound();
        const state = store.getState();
        const hiddenLetters = state.selectedWord.split('').filter(letter => !state.correctLetters.includes(letter));
        if (hiddenLetters.length > 0) {
            const hintLetter = hiddenLetters[Math.floor(Math.random() * hiddenLetters.length)];
            const keyButton = dom.keyboardDiv.querySelector(`button[data-key="${hintLetter}"]`);
            if (keyButton) handleGuess(hintLetter, keyButton);
            dom.hintButton.disabled = true;
        }
    });

    dom.revealWordBtn.addEventListener('click', () => {
        playClickSound();
        endGame(false, "You gave up! The word was...");
    });

    document.addEventListener('keydown', (event) => {
        if (dom.screens.game.classList.contains('active') && !dom.modalContainer.classList.contains('show')) {
            const pressedKey = event.key.toLowerCase();
            if (pressedKey.length === 1 && pressedKey >= 'a' && pressedKey <= 'z') {
                const keyButton = dom.keyboardDiv.querySelector(`button[data-key="${pressedKey}"]`);
                if (keyButton) handleGuess(pressedKey, keyButton);
            }
        }
    });

    // Modal Openers
    dom.howToPlayBtn.addEventListener('click', () => {
        showModal('tutorial');
    });

    dom.statsBtn.addEventListener('click', () => {
        showModal('stats');
        displayStats(store.getState().gameStats, store.getState().bestStreak);
    });

    dom.settingsBtn.addEventListener('click', () => {
        showModal('settings');
        // We need to re-attach the listener for the dynamically created slider
        dom.volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            setVolume(volume, store.getState().isMuted);
            localStorage.setItem('hangmanVolume', volume);
        });
        dom.volumeSlider.value = localStorage.getItem('hangmanVolume') || '1';
    });

    // Event delegation for dynamically created modal buttons
    dom.modalContent.addEventListener('click', (e) => {
        if (e.target.id === 'confirm-quit-btn') {
            playClickSound();
            if (store.getState().timerId) clearInterval(store.getState().timerId);
            if (store.getState().timedRushInterval) clearInterval(store.getState().timedRushInterval);
            hideModal();
            updateDailyChallengeButtonState();
            showScreen('category');
        }
        if (e.target.id === 'reset-stats-btn') {
            playClickSound();
            store.dispatch({ type: 'RESET_STATS' });
            localStorage.removeItem('hangmanStats');
            displayStats(store.getState().gameStats, store.getState().bestStreak);
        }
    });

    dom.muteBtn.addEventListener('click', () => {
        playClickSound();
        toggleMute(!store.getState().isMuted);
    });

    // Theme switcher logic
    dom.themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light-mode');
        const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('hangmanTheme', theme);
    });

    init();
});