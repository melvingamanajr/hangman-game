import { dom, getState, setGameState, wordData, difficultySettings } from './state.js';
import { showScreen, displayWord, createKeyboard, updateFigure, resetFigure, revealLetter, updateScoreDisplay, updateDailyStreakDisplay } from './ui.js';
import { sounds, playClickSound } from './audio.js';
import { getWordDefinition } from './api.js';
import { updateDailyChallengeButtonState } from './dailyChallenge.js';

export function startGameWithCategory(category) {
    setGameState({ selectedCategory: category });
    showScreen('difficulty');
}

export function startGameWithDifficulty(level) {
    const state = getState();
    const words = wordData[state.selectedCategory].words;
    setGameState({
        selectedDifficulty: difficultySettings[level],
        selectedWord: words[Math.floor(Math.random() * words.length)],
    });
    showScreen('game');
    initializeGame();
}

export function initializeGame() {
    const state = getState();
    setGameState({ correctLetters: [], wrongGuessCount: 0 });

    dom.categoryHintSpan.textContent = state.selectedCategory.charAt(0).toUpperCase() + state.selectedCategory.slice(1);
    displayWord(state.selectedWord);
    createKeyboard(handleGuess);
    updateFigure(0);
    dom.modalContainer.classList.remove('show');
    dom.hintButton.disabled = !state.selectedDifficulty.hints;
    startTimer();
}

function startTimer() {
    const state = getState();
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
    setGameState({ timerId });
}

export function handleGuess(letter, key) {
    if (key.disabled) return;
    key.disabled = true;

    const state = getState();
    if (state.selectedWord.includes(letter)) {
        if (!state.correctLetters.includes(letter)) {
            sounds.correct.play();
            state.correctLetters.push(letter);
            revealLetter(letter);
            checkWin();
        }
    } else {
        sounds.incorrect.play();
        const newWrongCount = state.wrongGuessCount + 1;
        setGameState({ wrongGuessCount: newWrongCount });
        dom.gameContentWrapper.classList.add('shake');
        setTimeout(() => dom.gameContentWrapper.classList.remove('shake'), 300);
        updateFigure(newWrongCount);
        if (newWrongCount === dom.hangmanParts.length) {
            endGame(false);
        }
    }
}

function checkWin() {
    const state = getState();
    if (new Set(state.selectedWord).size === state.correctLetters.length) {
        endGame(true);
    }
}

export async function endGame(isWinner, customMessage = null) {
    const state = getState();
    clearInterval(state.timerId);

    // Update stats
    state.gameStats.played++;
    if (isWinner) state.gameStats.wins++;
    localStorage.setItem('hangmanStats', JSON.stringify(state.gameStats));

    // Daily Challenge Logic
    if (state.selectedCategory === 'Daily Challenge') {
        const today = new Date();
        const todayStr = today.toDateString();
        localStorage.setItem('dailyChallengeLastPlayed', todayStr);

        if (isWinner) {
            const lastWinDateStr = localStorage.getItem('dailyChallengeLastWinDate');
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const newStreak = lastWinDateStr === yesterday.toDateString() ? state.dailyStreak + 1 : 1;
            setGameState({ dailyStreak: newStreak });
            if (newStreak > state.bestStreak) {
                setGameState({ bestStreak: newStreak });
                localStorage.setItem('hangmanBestStreak', newStreak);
            }
            localStorage.setItem('dailyChallengeLastWinDate', todayStr);
        } else {
            setGameState({ dailyStreak: 0 });
        }
        localStorage.setItem('dailyChallengeStreak', getState().dailyStreak);
        updateDailyStreakDisplay(getState().dailyStreak);
    }

    // Score and High Score
    let newHighScore = false;
    if (isWinner) {
        const newScore = state.currentScore + 1;
        setGameState({ currentScore: newScore });
        if (newScore > state.highScore) {
            setGameState({ highScore: newScore });
            newHighScore = true;
            localStorage.setItem('hangmanHighScore', newScore);
        }
        updateScoreDisplay(newScore, getState().highScore);
        sounds.win.play();
    } else {
        dom.gameContentWrapper.classList.add('lose-animation');
        sounds.lose.play();
    }

    // Show Modal
    dom.gameOverModalContent.innerHTML = `<div class="loading-spinner"></div>`;
    dom.modalContainer.classList.add('show');
    const definition = await getWordDefinition(state.selectedWord);

    dom.gameOverModalContent.innerHTML = `
        <h2>${customMessage || (isWinner ? 'Congratulations! You won! 😃' : 'You lost. 😕')}</h2>
        <p>The word was: <strong>${state.selectedWord}</strong></p>
        <p class="definition"><strong>Definition:</strong> ${definition}</p>
        <p>Your current score is: ${state.currentScore}</p>
        <div class="modal-buttons">
            <button id="play-again">Choose New Category</button>
            ${newHighScore ? '<button id="share-score-btn" class="btn-share">Share High Score!</button>' : ''}
        </div>
    `;

    document.getElementById('play-again').addEventListener('click', () => {
        playClickSound();
        dom.modalContainer.classList.remove('show');
        dom.gameContentWrapper.classList.remove('lose-animation');
        updateDailyChallengeButtonState();
        showScreen('category');
        resetFigure();
    });

    if (newHighScore) {
        document.getElementById('share-score-btn').addEventListener('click', () => {
            playClickSound();
            shareScore(getState().highScore);
        });
    }
}