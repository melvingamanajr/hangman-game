import { dom } from './state.js';

export const sounds = {
    correct: new Audio('src/assets/sounds/correct.mp3'),
    incorrect: new Audio('src/assets/sounds/incorrect.mp3'),
    win: new Audio('src/assets/sounds/win.mp3'),
    lose: new Audio('src/assets/sounds/lose.mp3'),
    backgroundMusic: new Audio('src/assets/sounds/music.mp3'),
    click: new Audio('src/assets/sounds/click.mp3'),
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
    const state = { isMuted: shouldMute };
    allSounds.forEach(sound => sound.muted = state.isMuted);
    dom.muteBtn.textContent = state.isMuted ? '🔇' : '🔊';
    // If unmuting and volume is 0, set it to a default
    dom.volumeSlider.value = state.isMuted ? 0 : (localStorage.getItem('hangmanVolume') || 1);
    localStorage.setItem('hangmanMuted', state.isMuted);
    return state.isMuted;
}

export function playBackgroundMusic(play) {
    if (play) sounds.backgroundMusic.play().catch(() => {});
    else sounds.backgroundMusic.pause();
}