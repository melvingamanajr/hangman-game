import { dom } from './state.js';
import { store } from './store.js';

export const sounds = {
    correct: new Audio('assets/sounds/correct.mp3'),
    incorrect: new Audio('assets/sounds/incorrect.mp3'),
    win: new Audio('assets/sounds/win.mp3'),
    lose: new Audio('assets/sounds/lose.mp3'),
    backgroundMusic: new Audio('assets/sounds/music.mp3'),
    click: new Audio('assets/sounds/click.mp3'),
    tick: new Audio('assets/sounds/tick.mp3'),
};

sounds.backgroundMusic.loop = true;

const allSounds = Object.values(sounds);

export function playClickSound() {
    sounds.click.currentTime = 0;
    sounds.click.play().catch(() => {});
}

export function setVolume(volume, isMuted) {
    allSounds.forEach(sound => sound.volume = volume);
    // If user adjusts volume, unmute
    if (volume > 0 && isMuted) {
        toggleMute(false);
    }
}

export function toggleMute(shouldMute) {
    store.dispatch({ type: 'SET_MUTE', payload: { isMuted: shouldMute } });
    allSounds.forEach(sound => sound.muted = shouldMute);
    dom.muteBtn.textContent = shouldMute ? '🔇' : '🔊';
    // If unmuting and volume is 0, set it to a default
    if (dom.volumeSlider) { // Only update slider if it exists in the DOM
        dom.volumeSlider.value = shouldMute ? 0 : (localStorage.getItem('hangmanVolume') || 1);
    }
    localStorage.setItem('hangmanMuted', shouldMute);
}

export function playBackgroundMusic(play) {
    if (play) sounds.backgroundMusic.play().catch(() => {});
    else sounds.backgroundMusic.pause();
}