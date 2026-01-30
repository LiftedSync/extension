import {
  log,
  createContentScriptState,
  setupVideoListeners,
  setupMessageListener,
  sendReady,
} from '@/lib/content-shared';

export default defineContentScript({
  matches: ['*://www.crunchyroll.com/*', '*://static.crunchyroll.com/*'],
  allFrames: true,
  runAt: 'document_idle',

  main() {
    log('Crunchyroll content script loaded', window.location.href);

    const state = createContentScriptState();
    let player: HTMLVideoElement | null = null;
    let cleanupListeners: (() => void) | null = null;
    let cleanupMessage: (() => void) | null = null;

    function findPlayer(): HTMLVideoElement | null {
      // Crunchyroll uses a player with id "player0" in an iframe
      const playerById = document.getElementById('player0') as HTMLVideoElement | null;
      if (playerById) return playerById;

      // Fallback: find any video element
      const videos = document.querySelectorAll('video');
      if (videos.length > 0) {
        return videos[0] as HTMLVideoElement;
      }

      return null;
    }

    function initPlayer() {
      const newPlayer = findPlayer();

      if (newPlayer && newPlayer !== player) {
        // Clean up old listeners
        if (cleanupListeners) {
          cleanupListeners();
        }

        player = newPlayer;
        log('Crunchyroll player found:', player.id || 'unnamed');

        // Set up listeners
        cleanupListeners = setupVideoListeners(player, state);
        state.lastProgress = player.currentTime;

        // Notify background that we're ready
        sendReady();
      }
    }

    // Initial setup with retry
    function tryInitPlayer(attempts = 0) {
      initPlayer();

      if (!player && attempts < 20) {
        // Retry for up to 10 seconds
        setTimeout(() => tryInitPlayer(attempts + 1), 500);
      }
    }

    tryInitPlayer();

    // Set up message listener
    cleanupMessage = setupMessageListener(player, state, () => player);

    // Watch for dynamic content changes
    const observer = new MutationObserver(() => {
      if (!player || !document.contains(player)) {
        player = null;
        initPlayer();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Periodic check for stale player
    const checkInterval = setInterval(() => {
      if (!player || !document.contains(player)) {
        player = null;
        cleanupListeners?.();
        cleanupListeners = null;
        initPlayer();
      }
    }, 2000);

    // Check URL parameter for auto-join
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('liftedSyncRoom');
    if (roomCode) {
      log('Found room code in URL:', roomCode);
      // Send auto-join request to background script
      browser.runtime.sendMessage({ action: 'autoJoin', roomId: roomCode }).catch((err) => {
        log('Failed to send auto-join message:', err);
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
