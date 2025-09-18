import { dom } from './state.js';
import { store } from './store.js';
import { wordData, difficultySettings, getAllWords } from './data.js';
import { showScreen, displayWord, createKeyboard, updateFigure, resetFigure, revealLetter, updateScoreDisplay, updateDailyStreakDisplay } from './ui.js';
import { sounds, playClickSound } from './audio.js';
import { getWordDefinition } from './api.js';
import { showModal } from './modal.js';
import { updateDailyChallengeButtonState } from './dailyChallenge.js';

function triggerAnimation(element) {
    element.style.animation = 'none';
    element.offsetHeight; /* trigger reflow */
    element.style.animation = 'pop 0.3s ease-out';
}

export function startGameWithCategory(category) {
    store.dispatch({ type: 'SET_CATEGORY', payload: { category } });
    showScreen('difficulty');
}

export function startGameWithDifficulty(level) {
    const state = store.getState();
    const words = wordData[state.selectedCategory].words;
    const wordIndex = Math.floor(Math.random() * words.length);
    store.dispatch({ type: 'SET_DIFFICULTY', payload: { level, wordIndex } });
    showScreen('game');
    initializeGame();
}

export function startTimedRushMode() {
    let timeLeft = 180; // 3 minutes
    const intervalId = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        if (seconds < 10) {
            seconds = `0${seconds}`;
        }
        dom.timedRushTimerSpan.textContent = `${minutes}:${seconds}`;
        timeLeft--;
        if (timeLeft <= 5 && timeLeft > 0) {
            sounds.tick.currentTime = 0; // Reset sound to the beginning
            sounds.tick.play();
            dom.timedRushTimerSpan.style.animation = 'pulse 1s infinite';
        } else if (timeLeft > 5) {
            dom.timedRushTimerSpan.style.animation = ''; // Stop animation
        }

        if (timeLeft <= 0) {
            clearInterval(store.getState().timedRushInterval);
            endGame(false, "Time's up! ⏰");
        }
    }, 1000);

    store.dispatch({ type: 'START_TIMED_RUSH', payload: { intervalId } });
    loadNewTimedRushWord();
}

function loadNewTimedRushWord() {
    const allWords = getAllWords();
    const newWord = allWords[Math.floor(Math.random() * allWords.length)];
    store.dispatch({ type: 'SET_NEW_TIMED_RUSH_WORD', payload: { word: newWord } });
    initializeGame();
}

export function initializeGame() {
    const state = store.getState();
    store.dispatch({ type: 'INITIALIZE_ROUND' });

    if (state.gameMode === 'timedRush') {
        dom.timedRushTimerContainer.style.display = 'flex';
        dom.timerSpan.parentElement.style.display = 'none'; // Hide per-word timer
        dom.timedRushStreakContainer.style.display = 'flex';
        dom.categoryHintSpan.textContent = "Timed Rush";
        dom.timedRushStreakSpan.textContent = state.timedRushStreak;
    } else {
        dom.timedRushTimerContainer.style.display = 'none';
        dom.timerSpan.parentElement.style.display = 'flex'; // Show per-word timer
        dom.timedRushStreakContainer.style.display = 'none';
        dom.categoryHintSpan.textContent = state.selectedCategory.charAt(0).toUpperCase() + state.selectedCategory.slice(1);
    }

    displayWord(state.selectedWord);
    createKeyboard(handleGuess);
    updateFigure(0);
    dom.modalContainer.classList.remove('show');
    dom.hintButton.disabled = !state.selectedDifficulty.hints;
    startTimer();
}

function startTimer() {
    const state = store.getState();
    // No individual word timer in timed rush mode
    if (state.gameMode === 'timedRush') {
        dom.timerSpan.textContent = '∞';
        return;
    }
    let timeLeft = state.selectedDifficulty.time;
    dom.timerSpan.textContent = `${timeLeft}s`;
    
    if (state.timerId) clearInterval(state.timerId);

    const timerId = setInterval(() => {
        timeLeft--;
        dom.timerSpan.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            endGame(false, "Time's up! ⏰");
        }
    }, 1000);
    store.dispatch({ type: 'SET_TIMER', payload: { timerId } });
}

export function handleGuess(letter, key) {
    if (key.disabled) return;
    key.disabled = true;

    const state = store.getState();
    if (state.selectedWord.includes(letter)) {
        if (!state.correctLetters.includes(letter)) {
            sounds.correct.play();
            store.dispatch({ type: 'CORRECT_GUESS', payload: { letter } });
            revealLetter(letter);
            checkWin();
        }
    } else {
        sounds.incorrect.play();
        store.dispatch({ type: 'INCORRECT_GUESS' });
        dom.gameContentWrapper.classList.add('shake');
        setTimeout(() => dom.gameContentWrapper.classList.remove('shake'), 300);
        updateFigure(store.getState().wrongGuessCount);
        if (store.getState().wrongGuessCount === dom.hangmanParts.length) {
            endGame(false);
        }
    }
}

function checkWin() {
    const state = store.getState();
    if (new Set(state.selectedWord).size === state.correctLetters.length) {
        endGame(true);
    }
}

export async function endGame(isWinner, customMessage = null) {
    let state = store.getState();
    if (state.timerId) clearInterval(state.timerId);
    const isTimedRush = state.gameMode === 'timedRush';

    // Update stats
    const newGameStats = { ...state.gameStats };
    newGameStats.played++;
    if (isWinner) newGameStats.wins++;
    localStorage.setItem('hangmanStats', JSON.stringify(newGameStats));
    let { dailyStreak, bestStreak, currentScore, highScore } = state;

    // Daily Challenge Logic
    if (state.selectedCategory === 'Daily Challenge') {
        const today = new Date();
        const todayStr = today.toDateString();
        localStorage.setItem('dailyChallengeLastPlayed', todayStr);

        if (isWinner) {
            const lastWinDateStr = localStorage.getItem('dailyChallengeLastWinDate');
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            dailyStreak = lastWinDateStr === yesterday.toDateString() ? state.dailyStreak + 1 : 1;
            if (dailyStreak > state.bestStreak) {
                bestStreak = dailyStreak;
                localStorage.setItem('hangmanBestStreak', bestStreak);
            }
            localStorage.setItem('dailyChallengeLastWinDate', todayStr);
        } else {
            dailyStreak = 0;
        }
        localStorage.setItem('dailyChallengeStreak', dailyStreak);
        updateDailyStreakDisplay(dailyStreak);
    }

    // Score and High Score
    let newHighScore = false;
    if (isWinner) {
        if (isTimedRush) {
            store.dispatch({ type: 'INCREMENT_TIMED_RUSH_STREAK' });
            triggerAnimation(dom.timedRushStreakSpan);
        }
        currentScore = state.currentScore + 1;
        if (currentScore > state.highScore) {
            highScore = currentScore;
            newHighScore = true;
            localStorage.setItem('hangmanHighScore', highScore);
            triggerAnimation(dom.highScoreSpan);
        }
        updateScoreDisplay(currentScore, highScore);
        triggerAnimation(dom.currentScoreSpan);
        sounds.win.play();
    } else {
        // In Timed Rush, losing a round doesn't end the mode unless time is up.
        if (isTimedRush && customMessage !== "Time's up! ⏰") {
            store.dispatch({ type: 'RESET_TIMED_RUSH_STREAK' });
            sounds.incorrect.play();
            loadNewTimedRushWord();
            return; // Skip the modal and continue the rush
        }
        dom.gameContentWrapper.classList.add('lose-animation');
        sounds.lose.play();
    }

    // Show Modal
    store.dispatch({ type: 'END_GAME', payload: {
        gameStats: newGameStats,
        dailyStreak,
        bestStreak,
        currentScore,
        highScore,
    }});
    state = store.getState(); // Get the final, updated state

    showModal('gameOver', `<div class="loading-spinner"></div>`);
    const definition = await getWordDefinition(state.selectedWord);

    const gameOverHTML = `
        <h2>${customMessage || (isWinner ? 'Congratulations! You won! 😃' : 'You lost. 😕')}</h2>
        <p>The word was: <strong>${state.selectedWord}</strong></p>
        <p class="definition"><strong>Definition:</strong> ${definition}</p>
        <p>Your current score is: ${state.currentScore}</p>
        ${isTimedRush ? `<p>You solved ${state.currentScore} words in 3 minutes!</p>` : ''}
        <div class="modal-buttons">
            <button id="play-again">Choose New Category</button>
            ${newHighScore ? '<button id="share-score-btn" class="btn-share">Share High Score!</button>' : ''}
        </div>
    `;
    showModal('gameOver', gameOverHTML);

    document.getElementById('play-again').addEventListener('click', () => {
        playClickSound();
        dom.timedRushTimerSpan.style.animation = ''; // Ensure animation stops
        if (state.timedRushInterval) clearInterval(state.timedRushInterval);
        dom.modalContainer.classList.remove('show');
        dom.gameContentWrapper.classList.remove('lose-animation');
        updateDailyChallengeButtonState();
        showScreen('category');
        resetFigure();
    });

    // In Timed Rush, a win loads the next word instead of showing the modal
    if (isWinner && isTimedRush) {
        loadNewTimedRushWord();
        return;
    }

    if (newHighScore) {
        document.getElementById('share-score-btn').addEventListener('click', () => {
            playClickSound();
            shareScore(store.getState().highScore);
        });
    }
}