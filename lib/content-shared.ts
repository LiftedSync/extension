import {config} from '@/lib/config';
import type {VideoState} from '@/lib/types';
import type {BackgroundToContentMessage, ContentToBackgroundMessage} from '@/lib/messages';

export function log(...args: unknown[]) {
    console.log('[LiftedSync Content]', ...args);
}

export interface ContentScriptState {
    isConnected: boolean;
    roomId: string | null;
    ignoreNext: {
        play: boolean;
        pause: boolean;
        timeupdate: boolean;
        seeked: boolean;
    };
    lastProgress: number;
}

export function createContentScriptState(): ContentScriptState {
    return {
        isConnected: false,
        roomId: null,
        ignoreNext: {
            play: false,
            pause: false,
            timeupdate: false,
            seeked: false,
        },
        lastProgress: 0,
    };
}

export function sendVideoUpdate(state: VideoState, currentTime: number) {
    const message: ContentToBackgroundMessage = {
        action: 'videoUpdate',
        state,
        currentTime,
    };
    browser.runtime.sendMessage(message).catch((err) => {
        log('Failed to send video update:', err);
    });
}

export function sendReady() {
    const message: ContentToBackgroundMessage = {action: 'ready'};
    browser.runtime.sendMessage(message).catch((err) => {
        log('Failed to send ready:', err);
    });
}

export type SeekFn = (player: HTMLVideoElement, time: number) => void;

export function handleRemoteUpdate(
    player: HTMLVideoElement,
    state: ContentScriptState,
    remoteState: VideoState,
    remoteTime: number,
    onSeek?: SeekFn,
) {
    if (!player) return;

    const currentState: VideoState = player.paused ? 'paused' : 'playing';
    const currentTime = player.currentTime;

    log('Remote update:', {remoteState, remoteTime, currentState, currentTime});

    // Handle play/pause state change
    if (currentState !== remoteState) {
        if (remoteState === 'paused') {
            state.ignoreNext.pause = true;
            player.pause();
        } else {
            state.ignoreNext.play = true;
            player.play().catch((err) => {
                log('Failed to play:', err);
                state.ignoreNext.play = false;
            });
        }
    }

    // Handle time sync if drift is too large
    if (Math.abs(remoteTime - currentTime) > config.DRIFT_TOLERANCE) {
        state.ignoreNext.timeupdate = true;
        state.ignoreNext.seeked = true;
        state.lastProgress = remoteTime;
        if (onSeek) {
            onSeek(player, remoteTime);
        } else {
            player.currentTime = remoteTime;
        }
        log('Synced time to:', remoteTime);
    }
}

export function setupVideoListeners(
    player: HTMLVideoElement,
    state: ContentScriptState
) {
    const handlePlay = () => {
        if (state.ignoreNext.play) {
            state.ignoreNext.play = false;
            return;
        }
        if (!state.isConnected) return;

        log('Local play event');
        sendVideoUpdate('playing', player.currentTime);
    };

    const handlePause = () => {
        if (state.ignoreNext.pause) {
            state.ignoreNext.pause = false;
            return;
        }
        if (!state.isConnected) return;

        log('Local pause event');
        sendVideoUpdate('paused', player.currentTime);
    };

    const handleTimeUpdate = () => {
        if (state.ignoreNext.timeupdate) {
            state.ignoreNext.timeupdate = false;
            state.lastProgress = player.currentTime;
            return;
        }
        if (!state.isConnected) return;

        // Check for significant time jump (seeking)
        const timeDiff = Math.abs(player.currentTime - state.lastProgress);
        if (timeDiff > config.DRIFT_TOLERANCE) {
            log('Local seek detected:', timeDiff);
            const currentState: VideoState = player.paused ? 'paused' : 'playing';
            sendVideoUpdate(currentState, player.currentTime);
        }

        state.lastProgress = player.currentTime;
    };

    const handleSeeked = () => {
        if (state.ignoreNext.seeked) {
            state.ignoreNext.seeked = false;
            return;
        }
        if (!state.isConnected) return;

        log('Local seeked event');
        const currentState: VideoState = player.paused ? 'paused' : 'playing';
        sendVideoUpdate(currentState, player.currentTime);
    };

    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('seeked', handleSeeked);

    return () => {
        player.removeEventListener('play', handlePlay);
        player.removeEventListener('pause', handlePause);
        player.removeEventListener('timeupdate', handleTimeUpdate);
        player.removeEventListener('seeked', handleSeeked);
    };
}

export function setupMessageListener(
    player: HTMLVideoElement | null,
    state: ContentScriptState,
    getPlayer: () => HTMLVideoElement | null,
    onSeek?: SeekFn,
) {
    const handleMessage = (
        message: BackgroundToContentMessage | { action: 'getCurrentTime' },
        _sender: unknown,
        sendResponse: (response: unknown) => void,
    ): boolean | void => {
        if (message.action === 'getCurrentTime') {
            const currentPlayer = getPlayer();
            if (currentPlayer) {
                sendResponse({currentTime: currentPlayer.currentTime});
            }
            return;
        }

        log('Received message:', message);

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
                    handleRemoteUpdate(currentPlayer, state, message.state, message.currentTime, onSeek);
                }
                break;

            case 'navigate':
                log('Navigating to:', message.url);
                window.location.href = message.url;
                break;
        }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
        browser.runtime.onMessage.removeListener(handleMessage);
    };
}