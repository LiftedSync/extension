import {config} from '@/lib/config';
import type {VideoState} from '@/lib/types';
import type {BackgroundToContentMessage} from '@/lib/messages';
import {
    log,
    createContentScriptState,
    setupVideoListeners,
    sendReady,
    type ContentScriptState,
} from '@/lib/content-shared';

// Inject the script into the page's main world (to access React internals)
function injectPrimeVideoControls() {
    const script = document.createElement('script');
    script.src = (browser.runtime.getURL as (path: string) => string)('primevideo-inject.js');
    script.onload = () => script.remove();
    script.onerror = (e) => log('Failed to load Prime Video inject script:', e);
    (document.head || document.documentElement).appendChild(script);
}

// Prime Video-specific control functions using injected elements
function primeVideoPlay() {
    const elem = document.getElementById('liftedSync-pv-play');
    if (elem) {
        elem.click();
    }
}

function primeVideoPause() {
    const elem = document.getElementById('liftedSync-pv-pause');
    if (elem) {
        elem.click();
    }
}

function primeVideoSeek(timeSeconds: number) {
    const elem = document.getElementById('liftedSync-pv-seek');
    if (elem) {
        // Prime Video API uses milliseconds
        elem.setAttribute('data-time', String(timeSeconds * 1000));
        elem.click();
    }
}

function handlePrimeVideoRemoteUpdate(
    video: HTMLVideoElement,
    state: ContentScriptState,
    remoteState: VideoState,
    remoteTime: number
) {
    if (!video) return;

    const currentState: VideoState = video.paused ? 'paused' : 'playing';
    const currentTime = video.currentTime;

    if (currentState !== remoteState) {
        if (remoteState === 'paused') {
            state.ignoreNext.pause = true;
            primeVideoPause();
        } else {
            state.ignoreNext.play = true;
            primeVideoPlay();
        }
    }

    if (Math.abs(remoteTime - currentTime) > config.DRIFT_TOLERANCE) {
        state.ignoreNext.timeupdate = true;
        primeVideoSeek(remoteTime);
    }
}

function setupPrimeVideoMessageListener(
    state: ContentScriptState,
    getPlayer: () => HTMLVideoElement | null
) {
    const handleMessage = (message: BackgroundToContentMessage) => {
        switch (message.action) {
            case 'connect':
                state.isConnected = true;
                state.roomId = message.roomId;
                log('Connected to room:', message.roomId);
                break;

            case 'disconnect':
                state.isConnected = false;
                state.roomId = null;
                log('Disconnected from room');
                break;

            case 'syncUpdate':
                const currentPlayer = getPlayer();
                if (currentPlayer && state.isConnected) {
                    handlePrimeVideoRemoteUpdate(currentPlayer, state, message.state, message.currentTime);
                }
                break;

            case 'navigate':
                window.location.href = message.url;
                break;
        }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
        browser.runtime.onMessage.removeListener(handleMessage);
    };
}

export default defineContentScript({
    matches: [
        '*://www.primevideo.com/*',
        '*://www.amazon.com/gp/video/*',
        '*://www.amazon.de/gp/video/*',
    ],
    runAt: 'document_idle',

    main() {
        log('Prime Video content script loaded');

        const state = createContentScriptState();
        let player: HTMLVideoElement | null = null;
        let cleanupListeners: (() => void) | null = null;
        let cleanupMessage: (() => void) | null = null;
        let controlsInjected = false;

        function findActiveVideo(): HTMLVideoElement | null {
            const allVideos = Array.from(document.querySelectorAll('video'));

            const candidates = allVideos.filter(v => {
                if (!v.src) return false;
                const rect = v.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (candidates.length === 0) return null;

            candidates.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                const areaA = rectA.width * rectA.height;
                const areaB = rectB.width * rectB.height;

                if (areaB !== areaA) {
                    return areaB - areaA;
                }
                return allVideos.indexOf(b) - allVideos.indexOf(a);
            });

            return candidates[0] as HTMLVideoElement;
        }

        function ensureControlsInjected() {
            if (!controlsInjected && document.body) {
                injectPrimeVideoControls();
                controlsInjected = true;
            }
        }

        function initPlayer() {
            ensureControlsInjected();

            const newPlayer = findActiveVideo();

            if (!newPlayer || !newPlayer.src) {
                return;
            }

            if (newPlayer === player) {
                return;
            }

            if (cleanupListeners) {
                cleanupListeners();
            }

            player = newPlayer;
            log('Prime Video active player found');

            cleanupListeners = setupVideoListeners(player, state);
            state.lastProgress = player.currentTime;
            sendReady();
        }

        // Initial setup
        initPlayer();

        // Set up message listener with Prime Video-specific handler
        cleanupMessage = setupPrimeVideoMessageListener(state, () => player);
        sendReady();

        // Prime Video is a SPA, watch for navigation changes
        const observer = new MutationObserver(() => {
            ensureControlsInjected();
            initPlayer();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const checkInterval = setInterval(() => {
            if (!controlsInjected) {
                ensureControlsInjected();
            }

            if (!player || !document.contains(player) || !player.src || player.getBoundingClientRect().width === 0) {
                player = null;
                cleanupListeners?.();
                cleanupListeners = null;
                initPlayer();
            }
        }, 1000);

        // Check URL parameter for auto-join
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('liftedSyncRoom');
        if (roomCode) {
            log('Found room code in URL:', roomCode);
            browser.runtime.sendMessage({action: 'autoJoin', roomId: roomCode}).catch(() => {
                // Silently fail - background script may not be ready
            });
        }

        // Cleanup on unload
        window.addEventListener('beforeunload', () => {
            clearInterval(checkInterval);
            observer.disconnect();
            if (cleanupListeners) cleanupListeners();
            if (cleanupMessage) cleanupMessage();
        });
    },
});