import { config } from '@/lib/config';
import type { VideoState } from '@/lib/types';
import type { BackgroundToContentMessage } from '@/lib/messages';
import {
  log,
  createContentScriptState,
  setupVideoListeners,
  sendReady,
  type ContentScriptState,
} from '@/lib/content-shared';

// Inject the script into the page's main world using a file (to bypass CSP)
function injectNetflixControls() {
  const script = document.createElement('script');
  script.src = (browser.runtime.getURL as (path: string) => string)('netflix-inject.js');
  script.onload = () => script.remove();
  script.onerror = (e) => log('Failed to load Netflix inject script:', e);
  (document.head || document.documentElement).appendChild(script);
}

// Netflix-specific control functions that use the injected elements
function netflixPlay() {
  const elem = document.getElementById('liftedSync-play');
  if (elem) {
    elem.click();
  } else {
    log('Play control element not found');
  }
}

function netflixPause() {
  const elem = document.getElementById('liftedSync-pause');
  if (elem) {
    elem.click();
  } else {
    log('Pause control element not found');
  }
}

function netflixSeek(timeSeconds: number) {
  const elem = document.getElementById('liftedSync-seek');
  if (elem) {
    // Netflix API uses milliseconds
    elem.setAttribute('data-time', String(timeSeconds * 1000));
    elem.click();
  } else {
    log('Seek control element not found');
  }
}

// Netflix-specific remote update handler (can't use standard one that sets currentTime directly)
function handleNetflixRemoteUpdate(
  video: HTMLVideoElement,
  state: ContentScriptState,
  remoteState: VideoState,
  remoteTime: number
) {
  if (!video) return;

  const currentState: VideoState = video.paused ? 'paused' : 'playing';
  const currentTime = video.currentTime;

  // Handle play/pause state change
  if (currentState !== remoteState) {
    if (remoteState === 'paused') {
      state.ignoreNext.pause = true;
      netflixPause();
    } else {
      state.ignoreNext.play = true;
      netflixPlay();
    }
  }

  // Handle time sync if drift is too large
  if (Math.abs(remoteTime - currentTime) > config.DRIFT_TOLERANCE) {
    state.ignoreNext.timeupdate = true;
    state.ignoreNext.seeked = true;
    state.lastProgress = remoteTime;
    netflixSeek(remoteTime);
  }
}

// Netflix-specific message listener (uses our custom remote update handler)
function setupNetflixMessageListener(
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
          handleNetflixRemoteUpdate(currentPlayer, state, message.state, message.currentTime);
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
  matches: ['*://www.netflix.com/*'],
  runAt: 'document_idle',

  main() {
    log('Netflix content script loaded');

    const state = createContentScriptState();
    let player: HTMLVideoElement | null = null;
    let cleanupListeners: (() => void) | null = null;
    let cleanupMessage: (() => void) | null = null;
    let controlsInjected = false;

    function isWatchPage(): boolean {
      return window.location.pathname.startsWith('/watch');
    }

    function findPlayer(): HTMLVideoElement | null {
      return document.querySelector('video');
    }

    function ensureControlsInjected() {
      if (!controlsInjected && document.body) {
        injectNetflixControls();
        controlsInjected = true;
      }
    }

    function initPlayer() {
      if (!isWatchPage()) {
        return;
      }

      ensureControlsInjected();

      const newPlayer = findPlayer();
      if (!newPlayer || newPlayer === player) {
        return;
      }

      if (cleanupListeners) {
        cleanupListeners();
      }

      player = newPlayer;
      log('Netflix player found');

      cleanupListeners = setupVideoListeners(player, state);
      state.lastProgress = player.currentTime;
      sendReady();
    }

    initPlayer();

    cleanupMessage = setupNetflixMessageListener(state, () => player);

    // Netflix is an SPA, watch for navigation changes
    const observer = new MutationObserver(() => {
      if (isWatchPage()) {
        initPlayer();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Periodic check for player (in case MutationObserver misses it)
    const checkInterval = setInterval(() => {
      if (isWatchPage() && (!player || !document.contains(player))) {
        player = null;
        cleanupListeners?.();
        cleanupListeners = null;
        initPlayer();
      }
    }, 500);

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