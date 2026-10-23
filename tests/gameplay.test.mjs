import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createStaticServer } from '../scripts/serve.mjs';
import { getAllWords, dailyChallengeWords } from '../src/js/data.js';
import { getWordClue, wordClues } from '../src/js/clues.js';

test('every playable word has a description that does not contain its answer', () => {
    for (const word of new Set([...getAllWords(), ...dailyChallengeWords])) {
        assert.ok(wordClues[word]?.length > 20, `Missing description for ${word}`);
        assert.doesNotMatch(getWordClue(word), new RegExp(`\\b${word}\\b`, 'i'));
    }
    assert.match(getWordClue('function'), /reusable block of code/i);
});

// Uses an installed Chrome/Edge and Node's native CDP/WebSocket support; no packages required.
async function browserPath() {
    const candidates = [process.env.BROWSER_PATH,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
    for (const path of candidates) {
        try { await access(path); return path; } catch { /* Try the next installation. */ }
    }
    throw new Error('Set BROWSER_PATH to an installed Chrome or Edge executable to run browser tests.');
}

test('gameplay and responsive browser regression checks', { timeout: 90000 }, async t => {
    const server = createStaticServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = await mkdtemp(join(tmpdir(), 'hangman-browser-'));
    const browser = spawn(await browserPath(), ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    t.after(() => { browser.kill(); });
    const endpoint = await new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => reject(new Error('Browser did not start: ' + output.slice(-800))), 15000);
        browser.on('error', error => { clearTimeout(timeout); reject(error); });
        browser.stderr.on('data', data => {
            output += data.toString();
            const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) { clearTimeout(timeout); resolve(match[1]); }
        });
    });
    const debugOrigin = endpoint.replace(/^ws:/, 'http:').replace(/\/devtools\/browser\/.*/, '');
    const target = await (await fetch(debugOrigin + '/json/new?about:blank', { method: 'PUT', signal: AbortSignal.timeout(5000) })).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await once(socket, 'open');
    t.after(() => socket.close());
    let nextId = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
        if (!message.id) return;
        const handler = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) handler.reject(new Error(message.error.message));
        else handler.resolve(message.result);
    });
    function cdp(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++nextId;
            const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timed out: ' + method)); }, 8000);
            pending.set(id, {
                resolve(value) { clearTimeout(timeout); resolve(value); },
                reject(error) { clearTimeout(timeout); reject(error); },
            });
            socket.send(JSON.stringify({ id, method, params }));
        });
    }
    async function evaluate(expression) {
        const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    }
    async function waitFor(expression) {
        for (let count = 0; count < 120; count++) {
            if (await evaluate(expression)) return;
            await delay(30);
        }
        throw new Error('Timed out: ' + expression);
    }
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    async function trustedClick(selector) {
        const { x, y } = await evaluate(`(() => {
            const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
            return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
        })()`);
        await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    }
    const musicState = () => evaluate(`import('/js/audio.js').then(({backgroundMusic}) => ({
        paused: backgroundMusic.paused, muted: backgroundMusic.muted, loop: backgroundMusic.loop,
        volume: backgroundMusic.volume, currentTime: backgroundMusic.currentTime,
        error: backgroundMusic.error?.code || null,
    }))`);
    const resultSoundState = name => evaluate(`import('/js/audio.js').then(({resultSounds}) => {
        const sound = resultSounds[${JSON.stringify(name)}];
        return { paused: sound.paused, muted: sound.muted, volume: sound.volume,
            currentTime: sound.currentTime, error: sound.error?.code || null };
    })`);
    const state = () => evaluate("import('/js/store.js').then(({store}) => store.getState())");
    const solve = () => evaluate(`(async () => {
        const {store} = await import('/js/store.js');
        const {handleGuess} = await import('/js/game.js');
        for (const letter of new Set(store.getState().selectedWord)) handleGuess(letter);
    })()`);
    async function reload() {
        await cdp('Page.navigate', { url: origin });
        await waitFor("document.querySelectorAll('#category-buttons-container button').length === 6");
    }
    async function screenshot(name) {
        // Capture the settled layout, including letter and screen transitions.
        await delay(300);
        await mkdir(new URL('../.qa/', import.meta.url), { recursive: true });
        const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        await writeFile(new URL('../.qa/' + name + '.png', import.meta.url), Buffer.from(data, 'base64'));
    }
    await cdp('Runtime.enable');
    await cdp('Page.enable');
    await cdp('Network.enable');
    await cdp('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.fetch = async () => { throw new Error('Offline dictionary fixture'); };
    ` });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await reload();
    await evaluate('localStorage.clear()');
    await reload();

    await t.test('home, categories, difficulty details, and keyboard-only navigation', async () => {
        assert.equal(await evaluate("document.querySelectorAll('.screen.active').length"), 1);
        await screenshot('home-desktop');
        await click('#start-game-btn');
        assert.equal(await evaluate('document.activeElement.id'), 'category-title');
        await click('#category-buttons-container button');
        assert.match(await evaluate("document.querySelector('#difficulty-buttons').textContent"), /120 seconds/);
        await click('#difficulty-buttons button');
        assert.equal((await state()).gameMode, 'classic');
        assert.equal(await evaluate("document.querySelectorAll('.key').length"), 26);
        assert.equal(await evaluate("document.querySelectorAll('.figure-part.visible').length"), 0);
        const description = await evaluate("document.querySelector('#word-description').textContent");
        assert.equal(description, getWordClue((await state()).selectedWord));
        assert.equal((await state()).waitingForFirstGuess, true);
        const readingTimer = await evaluate("document.querySelector('#timer').textContent");
        await delay(1100);
        assert.equal(await evaluate("document.querySelector('#timer').textContent"), readingTimer);
        await click('#pause-game-btn');
        assert.equal((await state()).paused, true);
        await click('#close-pause-btn');
        assert.equal((await state()).waitingForFirstGuess, true);
        const correct = (await state()).selectedWord[0];
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: correct.toUpperCase(), text: correct.toUpperCase() });
        assert.ok((await state()).correctLetters.includes(correct));
        assert.equal((await state()).waitingForFirstGuess, false);
        assert.equal(await evaluate("document.querySelector('#word-description').textContent"), description);
        const currentWord = (await state()).selectedWord;
        const wrong = [...'abcdefghijklmnopqrstuvwxyz'].find(letter => !currentWord.includes(letter));
        await click(`[data-key="${wrong}"]`);
        assert.equal((await state()).wrongGuessCount, 1);
        await click(`[data-key="${wrong}"]`);
        assert.equal((await state()).wrongGuessCount, 1);
        assert.equal(await evaluate("document.querySelectorAll('.life.lost').length"), 1);
    });

    await t.test('original music plays and loops, follows mute and volume, and resumes after settings', async () => {
        const response = await fetch(origin + '/assets/sounds/music.mp3');
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^audio\/mpeg/);
        await trustedClick('#mute-btn');
        assert.equal((await musicState()).paused, true);
        assert.equal((await musicState()).muted, true);
        await evaluate("import('/js/audio.js').then(({playSound}) => { playSound('win'); playSound('lose'); })");
        assert.equal((await resultSoundState('win')).paused, true);
        assert.equal((await resultSoundState('lose')).paused, true);
        assert.equal((await resultSoundState('win')).muted, true);
        await trustedClick('#mute-btn');
        await waitFor("import('/js/audio.js').then(({backgroundMusic}) => backgroundMusic.currentTime > 0)");
        assert.equal((await musicState()).loop, true);
        assert.equal((await musicState()).error, null);
        const position = (await musicState()).currentTime;
        await delay(200);
        assert.ok((await musicState()).currentTime > position);
        await click('#settings-btn');
        assert.equal((await musicState()).paused, true);
        await evaluate("const slider = document.querySelector('#volume-slider'); slider.value = '0'; slider.dispatchEvent(new Event('input', {bubbles:true}))");
        await click('#close-settings-btn');
        assert.equal((await musicState()).paused, true);
        assert.equal((await musicState()).volume, 0);
        await evaluate("import('/js/audio.js').then(({playSound}) => playSound('win'))");
        assert.equal((await resultSoundState('win')).paused, true);
        assert.equal((await resultSoundState('win')).volume, 0);
        await trustedClick('#settings-btn');
        await evaluate("document.querySelector('#volume-slider').value = '0.35'; document.querySelector('#volume-slider').dispatchEvent(new Event('input', {bubbles:true}))");
        await trustedClick('#close-settings-btn');
        await waitFor("import('/js/audio.js').then(({backgroundMusic}) => !backgroundMusic.paused)");
        assert.equal((await musicState()).volume, 0.175);
    });

    await t.test('pause, dialog focus trap, Escape resume, and one hint per round', async () => {
        await click('#pause-game-btn');
        assert.equal((await state()).paused, true);
        assert.equal((await musicState()).paused, true);
        const timer = await evaluate("document.querySelector('#timer').textContent");
        await delay(1100);
        assert.equal(await evaluate("document.querySelector('#timer').textContent"), timer);
        await evaluate("document.querySelector('#close-pause-btn').focus()");
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
        assert.equal(await evaluate('document.activeElement.id'), 'close-pause-btn');
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        assert.equal((await state()).paused, false);
        await waitFor("import('/js/audio.js').then(({backgroundMusic}) => !backgroundMusic.paused)");
        assert.equal(await evaluate("document.querySelector('#modal-container').classList.contains('show')"), false);
        await click('#hint-button');
        assert.equal((await state()).hintsUsed, true);
        const count = (await state()).correctLetters.length;
        await click('#hint-button');
        assert.equal((await state()).correctLetters.length, count);
        await evaluate("Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'))");
        assert.equal((await state()).paused, true);
        assert.equal(await evaluate("document.querySelector('#modal-title').textContent"), 'Take a breather.');
        assert.equal((await musicState()).paused, true);
        await evaluate("Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'))");
        await click('#close-pause-btn');
    });

    await t.test('win counts once and Next word resets the round and starts its timer immediately', async () => {
        const word = (await state()).selectedWord;
        await evaluate(`import('/js/audio.js').then(({resultSounds}) => {
            window.resultPlayCounts = {win: 0, lose: 0};
            for (const [name, sound] of Object.entries(resultSounds)) {
                sound.addEventListener('play', () => window.resultPlayCounts[name]++);
            }
        })`);
        await solve();
        await waitFor("import('/js/audio.js').then(({resultSounds}) => resultSounds.win.currentTime > 0)");
        assert.equal((await resultSoundState('win')).error, null);
        assert.equal((await resultSoundState('win')).volume, 0.35);
        assert.equal((await resultSoundState('lose')).paused, true);
        assert.equal((await state()).currentScore, 1);
        assert.equal((await musicState()).paused, true);
        assert.deepEqual((await state()).gameStats, { played: 1, wins: 1 });
        assert.equal(await evaluate("!!document.querySelector('#next-word-btn')"), true);
        await evaluate("import('/js/game.js').then(({endGame}) => endGame(true))");
        assert.equal(await evaluate('window.resultPlayCounts.win'), 1);
        assert.deepEqual((await state()).gameStats, { played: 1, wins: 1 });
        await click('#next-word-btn');
        assert.equal((await resultSoundState('win')).paused, true);
        assert.equal((await resultSoundState('win')).currentTime, 0);
        await waitFor("import('/js/audio.js').then(({backgroundMusic}) => !backgroundMusic.paused)");
        assert.notEqual((await state()).selectedWord, word);
        assert.equal((await state()).currentScore, 1);
        assert.equal((await state()).difficultyLevel, 'easy');
        assert.equal(await evaluate("document.querySelectorAll('.figure-part.visible').length"), 0);
        assert.equal((await state()).wrongGuessCount, 0);
        assert.equal((await state()).waitingForFirstGuess, false);
        assert.deepEqual((await state()).correctLetters, []);
        assert.match(await evaluate("document.querySelector('#clue-timing').textContent"), /clock is running/i);
        await waitFor("document.querySelector('#timer').textContent !== '2:00'");
        assert.deepEqual((await state()).correctLetters, []);
        await click('#pause-game-btn');
        const pausedReplayTimer = await evaluate("document.querySelector('#timer').textContent");
        await delay(1100);
        assert.equal(await evaluate("document.querySelector('#timer').textContent"), pausedReplayTimer);
        await click('#close-pause-btn');
        await screenshot('game-desktop');
        assert.equal((await state()).waitingForFirstGuess, false);
        await click('#hint-button');
        assert.equal((await state()).waitingForFirstGuess, false);
        assert.notEqual(await evaluate("document.querySelector('#timer').textContent"), '2:00');
    });

    await t.test('reveal confirmation, six misses, timer expiration, and stored statistics', async () => {
        await click('#reveal-word-btn');
        await click('#cancel-reveal-btn');
        assert.equal((await state()).roundActive, true);
        await click('#reveal-word-btn');
        await click('#confirm-reveal-btn');
        await waitFor("import('/js/audio.js').then(({resultSounds}) => resultSounds.lose.currentTime > 0)");
        assert.equal((await resultSoundState('lose')).error, null);
        assert.equal(await evaluate('window.resultPlayCounts.lose'), 1);
        assert.deepEqual((await state()).gameStats, { played: 2, wins: 1 });
        await click('#next-word-btn');
        assert.equal((await resultSoundState('lose')).paused, true);
        await evaluate(`(async () => {
            const {store} = await import('/js/store.js');
            const {handleGuess} = await import('/js/game.js');
            const wrong = [...'abcdefghijklmnopqrstuvwxyz'].filter(letter => !store.getState().selectedWord.includes(letter));
            wrong.slice(0, 6).forEach(letter => handleGuess(letter));
        })()`);
        assert.equal((await state()).wrongGuessCount, 6);
        await waitFor("import('/js/audio.js').then(({resultSounds}) => resultSounds.lose.currentTime > 0)");
        assert.equal(await evaluate('window.resultPlayCounts.lose'), 2);
        assert.deepEqual((await state()).gameStats, { played: 3, wins: 1 });
        await click('#next-word-btn');
        assert.equal((await state()).waitingForFirstGuess, false);
        assert.deepEqual((await state()).correctLetters, []);
        await evaluate('Date.now = () => performance.timeOrigin + performance.now() + 121000');
        await waitFor("document.querySelector('#modal-title')?.textContent === 'Time’s up!'");
        assert.deepEqual((await state()).gameStats, { played: 4, wins: 1 });
        await reload();
        assert.equal((await state()).highScore, 1);
        assert.deepEqual((await state()).gameStats, { played: 4, wins: 1 });
    });

    await t.test('rush advances without dictionary wait, preserves score, and resets figure and hints', async () => {
        await click('#timed-rush-btn');
        assert.equal((await state()).gameMode, 'timedRush');
        assert.equal((await state()).waitingForFirstGuess, false);
        assert.equal(await evaluate("document.querySelector('#word-description').textContent"), getWordClue((await state()).selectedWord));
        assert.equal(await evaluate("document.querySelector('#timed-rush-timer').textContent"), '3:00');
        const word = (await state()).selectedWord;
        await solve();
        assert.equal((await state()).currentScore, 1);
        assert.equal(await evaluate("document.querySelector('#modal-container').classList.contains('show')"), false);
        await waitFor("import('/js/store.js').then(({store}) => store.getState().roundActive)");
        assert.notEqual((await state()).selectedWord, word);
        assert.equal(await evaluate("document.querySelector('#word-description').textContent"), getWordClue((await state()).selectedWord));
        assert.equal((await state()).timedRushStreak, 1);
        await click('#reveal-word-btn');
        await click('#confirm-reveal-btn');
        await waitFor("import('/js/store.js').then(({store}) => store.getState().roundActive)");
        assert.equal((await state()).timedRushStreak, 0);
        assert.equal((await state()).currentScore, 1);
        assert.equal(await evaluate("document.querySelectorAll('.figure-part.visible').length"), 0);
        assert.equal(await evaluate("document.querySelector('#hint-button').disabled"), false);
        await evaluate('Date.now = () => performance.timeOrigin + performance.now() + 181000');
        await waitFor("document.querySelector('#modal-title')?.textContent === 'Time’s up!'");
        assert.equal((await state()).roundActive, false);
        await click('#result-menu-btn');
        await reload();
    });

    await t.test('daily starts once, has hard rules, tracks streak, and prevents replay', async () => {
        await click('#daily-challenge-btn');
        assert.equal((await state()).gameMode, 'daily');
        assert.ok((await state()).selectedWord);
        assert.equal(await evaluate("document.querySelector('#hint-button').disabled"), true);
        assert.equal(await evaluate("document.querySelector('#timer').textContent"), '1:00');
        assert.equal((await state()).waitingForFirstGuess, true);
        assert.equal(await evaluate("document.querySelector('#word-description').textContent"), getWordClue((await state()).selectedWord));
        const previous = (await state()).gameStats.played;
        await solve();
        assert.equal((await state()).gameStats.played, previous + 1);
        assert.equal((await state()).dailyStreak, 1);
        await click('#result-menu-btn');
        assert.equal(await evaluate("document.querySelector('#daily-challenge-btn').disabled"), true);
        await reload();
        assert.equal(await evaluate("document.querySelector('#daily-challenge-btn').disabled"), true);
    });

    await t.test('daily forfeit consumes the attempt and a missed day expires the streak', async () => {
        await evaluate("localStorage.removeItem('dailyChallengeLastPlayed')");
        await reload();
        await click('#daily-challenge-btn');
        await click('#quit-game-btn');
        await click('#confirm-quit-btn');
        assert.equal((await state()).dailyStreak, 0);
        await click('#result-menu-btn');
        assert.equal(await evaluate("document.querySelector('#daily-challenge-btn').disabled"), true);
        await evaluate(`localStorage.setItem('dailyChallengeStreak', '7');
            localStorage.setItem('dailyChallengeLastWinDate', 'Sun Jan 01 2023')`);
        await reload();
        assert.equal((await state()).dailyStreak, 0);
    });

    await t.test('theme, mute, and volume survive reload', async () => {
        await click('#theme-toggle');
        await click('#mute-btn');
        await click('#settings-btn');
        await evaluate("const slider = document.querySelector('#volume-slider'); slider.value = '0'; slider.dispatchEvent(new Event('input', {bubbles:true}))");
        await click('#close-settings-btn');
        await reload();
        assert.equal(await evaluate("document.body.classList.contains('light-mode')"), true);
        assert.equal((await state()).isMuted, true);
        await click('#settings-btn');
        assert.equal(await evaluate("document.querySelector('#volume-slider').value"), '0');
        await click('#close-settings-btn');
        await click('#theme-toggle');
    });

    await t.test('responsive layouts at 320, 390, 768, and 1440 pixels; long words and light theme', async () => {
        for (const width of [320, 390, 768, 1440]) {
            await cdp('Emulation.setDeviceMetricsOverride', { width, height: 850, deviceScaleFactor: 1, mobile: false });
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `home overflow at ${width}`);
            await click('#start-game-btn');
            await click('#category-buttons-container button:nth-child(5)');
            await click('#difficulty-buttons button:nth-child(3)');
            await evaluate(`(async () => {
                const {store} = await import('/js/store.js');
                store.dispatch({type:'SET_NEW_TIMED_RUSH_WORD',payload:{word:'photosynthesis',category:'science'}});
                const {initializeGame} = await import('/js/game.js'); initializeGame();
            })()`);
            assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `game overflow at ${width}`);
            assert.equal(await evaluate("document.querySelectorAll('.letter').length"), 14);
            if (width <= 500) {
                assert.equal(await evaluate("new Set([...document.querySelectorAll('.letter')].map(tile => tile.offsetTop)).size"), 1);
            }
            await click('#theme-toggle');
            if (width === 390) await screenshot('game-mobile-light');
            await click('#theme-toggle');
            await click('#quit-game-btn');
            await click('#confirm-quit-btn');
        }
    });

    await t.test('malformed and unavailable storage do not prevent play', async () => {
        await evaluate("localStorage.setItem('hangmanStats', '{bad json')");
        await reload();
        assert.deepEqual((await state()).gameStats, { played: 0, wins: 0 });
        await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
            Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
        ` });
        await reload();
        await click('#timed-rush-btn');
        await solve();
        assert.equal((await state()).currentScore, 1);
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
});
