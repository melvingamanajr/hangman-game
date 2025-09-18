import { dom } from './state.js';
import { playClickSound } from './audio.js';

const modalContents = {
    confirm: `
        <h2>Are you sure?</h2>
        <p>You will lose your progress for this round.</p>
        <div class="modal-buttons">
            <button id="confirm-quit-btn" class="btn-danger">Yes, Quit</button>
            <button id="cancel-quit-btn" class="btn-secondary">Cancel</button>
        </div>
    `,
    dailyPlayed: `
        <h2>Already Completed!</h2>
        <p>You've already played the daily challenge today. Come back tomorrow for a new word!</p>
        <p id="daily-countdown" class="countdown-timer"></p>
        <div class="modal-buttons">
            <button id="close-daily-played-btn" class="btn-primary">OK</button>
        </div>
    `,
    settings: `
        <h2>Settings</h2>
        <div class="setting-item">
            <label for="volume-slider">Sound Volume</label>
            <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="1">
        </div>
        <button id="close-settings-btn" class="btn-primary">Close</button>
    `,
    tutorial: `
        <h2>How to Play</h2>
        <div class="tutorial-content">
            <p>Guess the hidden word one letter at a time.</p>
            <p>Use your mouse to click the on-screen keyboard, or just type with your physical keyboard.</p>
            <p>Each incorrect guess will draw a part of the hangman. Don't let him be completed!</p>
            <p>The difficulty level affects the time limit and whether hints are available.</p>
            <p>Good luck!</p>
        </div>
        <button id="close-tutorial-btn" class="btn-primary">Got it!</button>
    `,
    stats: `
        <h2>Statistics</h2>
        <div class="stats-grid">
            <div class="stat-item">
                <span id="stats-games-played" class="stat-value">0</span>
                <span class="stat-label">Played</span>
            </div>
            <div class="stat-item">
                <span id="stats-wins" class="stat-value">0</span>
                <span class="stat-label">Wins</span>
            </div>
            <div class="stat-item">
                <span id="stats-win-ratio" class="stat-value">0</span>
                <span class="stat-label">Win %</span>
            </div>
            <div class="stat-item">
                <span id="stats-best-streak" class="stat-value">0</span>
                <span class="stat-label">Best Streak</span>
            </div>
        </div>
        <div class="modal-buttons">
            <button id="reset-stats-btn" class="btn-secondary">Reset</button>
            <button id="close-stats-btn" class="btn-primary">Close</button>
        </div>
    `,
    gameOver: (content) => `
        <div id="game-over-modal-content">${content}</div>
    `
};

let currentModalType = null;

export function showModal(type, dynamicContent = '') {
    playClickSound();
    currentModalType = type;
    let content = '';

    if (type === 'gameOver') {
        content = modalContents.gameOver(dynamicContent);
    } else {
        content = modalContents[type];
    }

    dom.modalContent.innerHTML = content;
    dom.modalContainer.classList.add('show');

    // Re-query for dynamic elements inside the modal
    if (type === 'settings') {
        dom.volumeSlider = document.getElementById('volume-slider');
    }
}

export function hideModal() {
    if (currentModalType === 'gameOver') return; // Game over modal has its own close logic
    playClickSound();
    dom.modalContainer.classList.remove('show');
    dom.modalContent.innerHTML = '';
    currentModalType = null;
}

// General click listener for closing modals
export function initializeModal() {
    dom.modalContainer.addEventListener('click', (e) => {
        // Close if the background is clicked
        if (e.target === dom.modalContainer) {
            hideModal();
        }
        // Close if a 'close' button is clicked
        if (e.target.id.startsWith('close-') || e.target.id === 'cancel-quit-btn') {
            hideModal();
        }
    });
}