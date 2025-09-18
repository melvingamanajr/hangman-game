import { dom, wordData, difficultySettings, getState } from './state.js';
import { playBackgroundMusic, playClickSound } from './audio.js';
import { startGameWithCategory, startGameWithDifficulty } from './game.js';

export function showScreen(screenName) {
    const state = getState();
    let currentScreen = null;
    for (const key in dom.screens) {
        if (dom.screens[key].classList.contains('active')) {
            currentScreen = dom.screens[key];
            break;
        }
    }

    if (currentScreen) {
        currentScreen.classList.remove('active');
        setTimeout(() => {
            dom.screens[screenName].classList.add('active');
        }, 400);
    } else {
        dom.screens[screenName].classList.add('active');
    }

    const shouldPlayMusic = ['intro', 'category', 'difficulty'].includes(screenName);
    playBackgroundMusic(shouldPlayMusic && state.hasInteracted);
}

export function createCategoryButtons() {
    dom.categoryButtonsDiv.innerHTML = '';
    for (const category in wordData) {
        const button = document.createElement('button');
        const categoryInfo = wordData[category];
        button.innerHTML = `
            <span class="category-icon">${categoryInfo.icon}</span>
            <span class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
        `;
        button.classList.add('category-btn-item');
        button.addEventListener('click', () => {
            playClickSound();
            startGameWithCategory(category);
        });
        dom.categoryButtonsDiv.appendChild(button);
    }
}

export function createDifficultyButtons() {
    dom.difficultyButtonsDiv.innerHTML = '';
    for (const level in difficultySettings) {
        const button = document.createElement('button');
        const levelInfo = difficultySettings[level];
        button.innerHTML = `
            <span class="category-icon">${levelInfo.icon}</span>
            <span class="category-name">${level.charAt(0).toUpperCase() + level.slice(1)}</span>
        `;
        button.classList.add('category-btn-item');
        button.addEventListener('click', () => {
            playClickSound();
            startGameWithDifficulty(level);
        });
        dom.difficultyButtonsDiv.appendChild(button);
    }
}

export function displayWord(word) {
    dom.wordDisplay.innerHTML = word
        .split('')
        .map(
            letter => `
                <span class="letter" data-letter="${letter}">
                    <span class="letter-inner">
                        <span class="letter-front"></span>
                        <span class="letter-back">${letter}</span>
                    </span>
                </span>
            `
        )
        .join('');
}

export function revealLetter(guessedLetter) {
    const letterElements = document.querySelectorAll(`.letter[data-letter="${guessedLetter}"]`);
    letterElements.forEach(el => el.classList.add('flip'));
}

export function createKeyboard(handleGuess) {
    const keyboardLayout = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    dom.keyboardDiv.innerHTML = '';
    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('keyboard-row');
        row.split('').forEach(letter => {
            const key = document.createElement('button');
            key.textContent = letter;
            key.classList.add('key');
            key.setAttribute('data-key', letter);
            key.addEventListener('click', () => handleGuess(letter, key));
            rowDiv.appendChild(key);
        });
        dom.keyboardDiv.appendChild(rowDiv);
    });
}

export function updateFigure(wrongGuessCount) {
    dom.hangmanParts.forEach((part, index) => {
        if (index < wrongGuessCount) {
            part.classList.add('visible');
        }
    });
}

export function resetFigure() {
    dom.hangmanParts.forEach(part => {
        part.classList.remove('dizzy');
        part.classList.remove('visible');
    });
}

export function updateScoreDisplay(currentScore, highScore) {
    dom.currentScoreSpan.textContent = currentScore;
    dom.highScoreSpan.textContent = highScore;
}

export function updateDailyStreakDisplay(dailyStreak) {
    dom.dailyStreakSpan.textContent = dailyStreak;
}

export function displayStats(gameStats, bestStreak) {
    document.getElementById('stats-games-played').textContent = gameStats.played;
    document.getElementById('stats-wins').textContent = gameStats.wins;
    document.getElementById('stats-best-streak').textContent = bestStreak;
    const winRatio = gameStats.played > 0 ? Math.round((gameStats.wins / gameStats.played) * 100) : 0;
    document.getElementById('stats-win-ratio').textContent = winRatio;
}

export async function shareScore(highScore) {
    const shareText = `I set a new high score of ${highScore} in Hangman! Can you beat it?`;
    const shareData = {
        title: 'Hangman High Score!',
        text: shareText,
        url: window.location.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareText);
            alert('High score message copied to clipboard!');
        }
    } catch (err) {
        alert(`Couldn't share automatically. Here's your message to copy: ${shareText}`);
    }
}