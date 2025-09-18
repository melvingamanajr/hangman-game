import { dom } from './state.js';
import { dailyChallengeWords } from './data.js';
import { initializeGame } from './game.js';
import { showScreen } from './ui.js';

export function getDailyWord() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % dailyChallengeWords.length;
    return dailyChallengeWords[index];
}

export function startDailyChallenge() {
    const todayStr = new Date().toDateString();
    const lastPlayedDate = localStorage.getItem('dailyChallengeLastPlayed');

    if (lastPlayedDate === todayStr) {
        return null; // Indicate challenge was already played
    }
    showScreen('game');
    initializeGame();
    return getDailyWord();
}

export function startDailyCountdown() {
    const originalText = dom.dailyChallengeBtnText.innerHTML;
    let interval;

    const updateCountdown = () => {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diff = tomorrow - now;

        if (diff < 0) {
            dom.dailyChallengeBtnText.textContent = "New Challenge!";
            clearInterval(interval);
            return;
        }
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        dom.dailyChallengeBtnText.textContent = `Next in: ${hours}h ${minutes}m ${seconds}s`;
    };

    dom.dailyChallengeBtn.addEventListener('mouseenter', () => {
        clearInterval(interval);
        updateCountdown();
        interval = setInterval(updateCountdown, 1000);
    });

    dom.dailyChallengeBtn.addEventListener('mouseleave', () => {
        clearInterval(interval);
        dom.dailyChallengeBtnText.innerHTML = originalText;
    });
}

export function updateDailyChallengeButtonState() {
    const todayStr = new Date().toDateString();
    const lastPlayedDate = localStorage.getItem('dailyChallengeLastPlayed');
    dom.dailyChallengeBtn.disabled = lastPlayedDate === todayStr;
    dom.dailyChallengeBtnText.textContent = lastPlayedDate === todayStr ? 'Completed ✓' : 'Daily Challenge';
    if (dom.dailyChallengeBtn.disabled) startDailyCountdown();
}