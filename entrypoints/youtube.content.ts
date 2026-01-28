import {
  log,
  createContentScriptState,
  setupVideoListeners,
  setupMessageListener,
  sendReady,
} from '@/lib/content-shared';

export default defineContentScript({
  matches: ['*://www.youtube.com/*'],
  runAt: 'document_idle',

  main() {
    log('YouTube content script loaded');

    const state = createContentScriptState();
    let player: HTMLVideoElement | null = null;
    let cleanupListeners: (() => void) | null = null;
    let cleanupMessage: (() => void) | null = null;

    function findPlayer(): HTMLVideoElement | null {
      return document.querySelector('video.html5-main-video');
    }

    function initPlayer() {
      const newPlayer = findPlayer();

      if (newPlayer && newPlayer !== player) {
        // Clean up old listeners
        if (cleanupListeners) {
          cleanupListeners();
        }

        player = newPlayer;
        log('YouTube player found');

        // Set up listeners
        cleanupListeners = setupVideoListeners(player, state);
        state.lastProgress = player.currentTime;

        // Notify background that we're ready
        sendReady();
      }
    }

    // Initial setup
    initPlayer();

    // Set up message listener
    cleanupMessage = setupMessageListener(player, state, () => player);

    // YouTube is a SPA, so we need to watch for navigation changes
    const observer = new MutationObserver(() => {
      // Check if we're on a watch page
      if (window.location.pathname === '/watch') {
        initPlayer();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also check periodically for player (in case MutationObserver misses it)
    const checkInterval = setInterval(() => {
      if (!player || !document.contains(player)) {
        player = null;
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
