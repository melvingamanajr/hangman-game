import { dom, getState, setGameState } from './state.js';
import { playClickSound, setVolume, toggleMute } from './audio.js';
import { showScreen, createCategoryButtons, createDifficultyButtons, resetFigure, displayStats, updateScoreDisplay, updateDailyStreakDisplay } from './ui.js';
import { initializeGame, handleGuess, endGame } from './game.js';
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

        setGameState({
            highScore: savedHighScore,
            dailyStreak: savedDailyStreak,
            bestStreak: savedBestStreak,
            gameStats: savedGameStats,
        });

        // UI Updates
        updateScoreDisplay(0, savedHighScore);
        updateDailyStreakDisplay(savedDailyStreak);
        createCategoryButtons();
        createDifficultyButtons();
        resetFigure();
        updateDailyChallengeButtonState();

        // Settings
        setVolume(savedVolume);
        dom.volumeSlider.value = savedVolume;
        toggleMute(savedMuteState);

        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            dom.themeToggle.checked = true;
        }

        showScreen('intro');
    }

    // --- EVENT LISTENERS ---
    dom.startGameBtn.addEventListener('click', () => {
        playClickSound();
        setGameState({ hasInteracted: true, currentScore: 0 });
        updateScoreDisplay(0, getState().highScore);
        showScreen('category');
    });

    dom.dailyChallengeBtn.addEventListener('click', () => {
        playClickSound();
        setGameState({ hasInteracted: true });
        startDailyChallenge();
    });

    dom.quitGameBtn.addEventListener('click', () => {
        playClickSound();
        dom.confirmModalContainer.classList.add('show');
    });

    dom.backToIntroBtn.addEventListener('click', () => {
        playClickSound();
        setGameState({ hasInteracted: true });
        showScreen('intro');
    });

    dom.backToCategoryBtn.addEventListener('click', () => {
        playClickSound();
        showScreen('category');
    });

    dom.hintButton.addEventListener('click', () => {
        playClickSound();
        const state = getState();
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

    dom.closeDailyPlayedBtn.addEventListener('click', () => {
        playClickSound();
        if (getState().dailyCountdownInterval) clearInterval(getState().dailyCountdownInterval);
        dom.dailyPlayedModalContainer.classList.remove('show');
    });

    // Confirmation Modal Logic
    dom.confirmQuitBtn.addEventListener('click', () => {
        playClickSound();
        if (getState().timerId) clearInterval(getState().timerId);
        dom.confirmModalContainer.classList.remove('show');
        updateDailyChallengeButtonState();
        showScreen('category');
    });

    dom.cancelQuitBtn.addEventListener('click', () => {
        playClickSound();
        dom.confirmModalContainer.classList.remove('show');
    });

    // How to Play Modal Logic
    dom.howToPlayBtn.addEventListener('click', () => {
        playClickSound();
        dom.tutorialModalContainer.classList.add('show');
    });

    dom.closeTutorialBtn.addEventListener('click', () => {
        playClickSound();
        dom.tutorialModalContainer.classList.remove('show');
    });

    // Statistics Modal Logic
    dom.statsBtn.addEventListener('click', () => {
        playClickSound();
        displayStats(getState().gameStats, getState().bestStreak);
        dom.statsModalContainer.classList.add('show');
    });

    dom.closeStatsBtn.addEventListener('click', () => {
        playClickSound();
        dom.statsModalContainer.classList.remove('show');
    });

    dom.resetStatsBtn.addEventListener('click', () => {
        playClickSound();
        setGameState({ gameStats: { played: 0, wins: 0 } });
        localStorage.removeItem('hangmanStats');
        displayStats(getState().gameStats, getState().bestStreak);
    });

    // Settings Modal Logic
    dom.settingsBtn.addEventListener('click', () => {
        playClickSound();
        dom.settingsModalContainer.classList.add('show');
    });

    dom.closeSettingsBtn.addEventListener('click', () => {
        playClickSound();
        dom.settingsModalContainer.classList.remove('show');
    });

    dom.volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        setVolume(volume, getState().isMuted);
        localStorage.setItem('hangmanVolume', volume);
    });

    dom.muteBtn.addEventListener('click', () => {
        playClickSound();
        const newMuteState = toggleMute(!getState().isMuted);
        setGameState({ isMuted: newMuteState });
    });

    // Theme switcher logic
    dom.themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light-mode');
        const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('hangmanTheme', theme);
    });

    init();
});