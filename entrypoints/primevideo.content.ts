import {
    log,
    createContentScriptState,
    setupVideoListeners,
    setupMessageListener,
    sendReady,
    type SeekFn,
} from '@/lib/content-shared';

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

        function findActiveVideo(): HTMLVideoElement | null {
            const allVideos = Array.from(document.querySelectorAll('video'));

            const candidates = allVideos.filter((v) => {
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

        function initPlayer() {
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

        const primeVideoSeek: SeekFn = (video, time) => {
            if (video.paused) {
                state.ignoreNext.play = true;
                state.ignoreNext.pause = true;
                video.play()
                    .then(() => {
                        video.currentTime = time;
                        video.pause();
                    })
                    .catch(() => {
                        video.currentTime = time;
                    });
            } else {
                video.currentTime = time;
            }
        };

        // Initial setup
        initPlayer();

        // Set up message listener with Prime Video-specific seek
        cleanupMessage = setupMessageListener(player, state, () => player, primeVideoSeek);
        sendReady();

        // Prime Video is a SPA, watch for navigation changes
        const observer = new MutationObserver(() => {
            initPlayer();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        const checkInterval = setInterval(() => {
            if (
                !player ||
                !document.contains(player) ||
                !player.src ||
                player.getBoundingClientRect().width === 0
            ) {
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