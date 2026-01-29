import {config} from '@/lib/config';
import type {Platform, UserInfo, VideoState} from '@/lib/types';
import {getUrlPatternsForPlatform, isSupportedUrl, isValidUrlForPlatform} from '@/lib/platforms';
import type {
    BackgroundToContentMessage,
    BackgroundToPopupMessage,
    ClientMessage,
    ContentToBackgroundMessage,
    PopupToBackgroundMessage,
    ServerMessage,
} from '@/lib/messages';

interface RoomState {
    roomId: string;
    platform: Platform;
    state: VideoState;
    currentTime: number;
    users: UserInfo[];
}

let ws: WebSocket | null = null;
let roomState: RoomState | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Track tabs with active content scripts
const activeTabs = new Set<number>();

// Connection status
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
let connectionStatus: ConnectionStatus = 'disconnected';

// Pending message to send once WebSocket connects
let pendingMessage: ClientMessage | null = null;

function log(...args: unknown[]) {
    console.log('[LiftedSync Background]', ...args);
}

async function getOrGenerateUserName(providedName?: string): Promise<string> {
    // If a name was provided, save it and use it
    if (providedName && providedName.trim()) {
        await browser.storage.local.set({userName: providedName.trim()});
        return providedName.trim();
    }

    // Otherwise, check storage for a stored username
    const result = await browser.storage.local.get('userName');
    if (result.userName && typeof result.userName === 'string') {
        return result.userName;
    }

    // Generate a new username without storing it
    return `User${Math.floor(Math.random() * 10000)}`;
}

function sendToPopup(message: BackgroundToPopupMessage) {
    browser.runtime.sendMessage(message).catch(() => {
        // Popup might be closed, ignore
    });
}

function sendToContentScript(tabId: number, message: BackgroundToContentMessage) {
    browser.tabs.sendMessage(tabId, message).catch((err) => {
        log('Failed to send to content script:', err);
    });
}

async function broadcastToContentScripts(message: BackgroundToContentMessage) {
    if (!roomState) return;

    const tabs = await browser.tabs.query({
        url: getUrlPatternsForPlatform(roomState.platform),
    });

    for (const tab of tabs) {
        if (tab.id) {
            sendToContentScript(tab.id, message);
        }
    }
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            sendMessage({type: 'heartbeat'});
        }
    }, config.HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function sendMessage(message: ClientMessage) {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        log('Sent:', message);
    } else {
        log('WebSocket not open, cannot send:', message);
    }
}

function handleServerMessage(message: ServerMessage) {
    log('Received:', message);

    switch (message.type) {
        case 'room_created':
            // Room created, waiting for room_joined
            sendToPopup({action: 'roomCreated', roomId: message.roomId});
            break;

        case 'room_joined':
            roomState = {
                roomId: message.roomId,
                platform: message.platform,
                state: message.state,
                currentTime: message.currentTime,
                users: message.users,
            };
            connectionStatus = 'connected';
            reconnectAttempts = 0;
            pendingMessage = null;

            sendToPopup({
                action: 'statusUpdate',
                status: 'connected',
                roomId: message.roomId,
                platform: message.platform,
                users: message.users,
            });

            // Notify content scripts to connect
            broadcastToContentScripts({
                action: 'connect',
                roomId: message.roomId,
                platform: message.platform,
            });

            // Send initial sync state to content scripts
            broadcastToContentScripts({
                action: 'syncUpdate',
                state: message.state,
                currentTime: message.currentTime,
            });
            break;

        case 'sync_update':
            if (roomState) {
                roomState.state = message.state;
                roomState.currentTime = message.currentTime;

                // Forward to content scripts
                broadcastToContentScripts({
                    action: 'syncUpdate',
                    state: message.state,
                    currentTime: message.currentTime,
                });
            }
            break;

        case 'user_joined':
            if (roomState) {
                log('User joined:', message.userName, 'Total:', message.userCount);
                roomState.users = message.users;
                sendToPopup({
                    action: 'userUpdate',
                    users: message.users,
                });
            }
            break;

        case 'user_left':
            if (roomState) {
                log('User left:', message.userName, 'Total:', message.userCount);
                roomState.users = message.users;
                sendToPopup({
                    action: 'userUpdate',
                    users: message.users,
                });
            }
            break;

        case 'navigate_update':
            if (roomState) {
                log('Navigate update:', message.url);
                // Forward to content scripts to navigate the tab
                broadcastToContentScripts({
                    action: 'navigate',
                    url: message.url,
                });
            }
            break;

        case 'error':
            log('Server error:', message.code, message.message);
            connectionStatus = 'error';
            sendToPopup({
                action: 'statusUpdate',
                status: 'error',
                error: message.message,
            });
            break;
    }
}

function connect() {
    if (ws?.readyState === WebSocket.CONNECTING || ws?.readyState === WebSocket.OPEN) {
        log('Already connected or connecting');
        return;
    }

    connectionStatus = 'connecting';
    sendToPopup({action: 'statusUpdate', status: 'connecting'});

    ws = new WebSocket(config.backendUrl);

    ws.onopen = () => {
        log('WebSocket connected');
        startHeartbeat();

        // If we have a pending message, send it now
        if (pendingMessage) {
            sendMessage(pendingMessage);
            pendingMessage = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data) as ServerMessage;
            handleServerMessage(message);
        } catch (err) {
            log('Failed to parse message:', err);
        }
    };

    ws.onclose = (event) => {
        log('WebSocket closed:', event.code, event.reason);
        stopHeartbeat();
        ws = null;

        if (roomState && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            // Attempt to reconnect
            reconnectAttempts++;
            log(`Reconnecting... attempt ${reconnectAttempts}`);
            setTimeout(connect, 1000 * reconnectAttempts);
        } else {
            connectionStatus = 'disconnected';
            roomState = null;
            sendToPopup({action: 'statusUpdate', status: 'disconnected'});
            broadcastToContentScripts({action: 'disconnect'});
        }
    };

    ws.onerror = (error) => {
        log('WebSocket error:', error);
    };
}

function disconnect() {
    stopHeartbeat();
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect

    if (ws) {
        sendMessage({type: 'leave_room'});
        ws.close();
        ws = null;
    }

    roomState = null;
    connectionStatus = 'disconnected';
    pendingMessage = null;

    sendToPopup({action: 'statusUpdate', status: 'disconnected'});
    broadcastToContentScripts({action: 'disconnect'});
}

function handlePopupMessage(message: PopupToBackgroundMessage) {
    log('Popup message:', message);

    switch (message.action) {
        case 'createRoom':
            getOrGenerateUserName(message.userName).then((userName) => {
                const clientMsg: ClientMessage = {
                    type: 'create_room',
                    userName,
                    platform: message.platform,
                };
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    pendingMessage = clientMsg;
                    connect();
                } else {
                    sendMessage(clientMsg);
                }
            });
            break;

        case 'joinRoom':
            getOrGenerateUserName(message.userName).then((userName) => {
                const clientMsg: ClientMessage = {
                    type: 'join_room',
                    roomId: message.roomId,
                    userName,
                };
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    pendingMessage = clientMsg;
                    connect();
                } else {
                    sendMessage(clientMsg);
                }
            });
            break;

        case 'leaveRoom':
            disconnect();
            break;

        case 'getStatus':
            sendToPopup({
                action: 'statusUpdate',
                status: connectionStatus,
                roomId: roomState?.roomId,
                platform: roomState?.platform,
                users: roomState?.users,
            });
            break;

        case 'navigate':
            if (roomState && ws?.readyState === WebSocket.OPEN) {
                sendMessage({
                    type: 'navigate',
                    url: message.url,
                });
            }
            break;
    }
}

function handleContentScriptMessage(
    message: ContentToBackgroundMessage,
    sender: Browser.runtime.MessageSender
) {
    const tabId = sender.tab?.id;
    log('Content script message:', message, 'from tab:', tabId);

    switch (message.action) {
        case 'videoUpdate':
            if (roomState) {
                // Only forward updates from tabs matching the room's platform
                const senderUrl = sender.tab?.url || sender.url || '';
                if (!isValidUrlForPlatform(senderUrl, roomState.platform)) {
                    log('Ignoring videoUpdate from non-matching platform tab:', senderUrl);
                    break;
                }

                roomState.state = message.state;
                roomState.currentTime = message.currentTime;

                sendMessage({
                    type: 'video_update',
                    state: message.state,
                    currentTime: message.currentTime,
                });
            }
            break;

        case 'ready':
            // Content script is ready - enable the extension icon for this tab
            if (tabId) {
                activeTabs.add(tabId);
                browser.action.enable(tabId);
                log('Enabled extension for tab:', tabId);

                // Send current state if in a room and tab matches the room's platform
                if (roomState) {
                    const tabUrl = sender.tab?.url || '';
                    if (isValidUrlForPlatform(tabUrl, roomState.platform)) {
                        sendToContentScript(tabId, {
                            action: 'connect',
                            roomId: roomState.roomId,
                            platform: roomState.platform,
                        });
                        sendToContentScript(tabId, {
                            action: 'syncUpdate',
                            state: roomState.state,
                            currentTime: roomState.currentTime,
                        });
                    }
                }
            }
            break;

        case 'autoJoin':
            // Auto-join a room from URL parameter
            if (!roomState) {
                getOrGenerateUserName().then((userName) => {
                    log('Auto-joining room:', message.roomId, 'as', userName);
                    const clientMsg: ClientMessage = {
                        type: 'join_room',
                        roomId: message.roomId,
                        userName,
                    };
                    if (!ws || ws.readyState !== WebSocket.OPEN) {
                        pendingMessage = clientMsg;
                        connect();
                    } else {
                        sendMessage(clientMsg);
                    }
                });
            } else {
                log('Already in a room, ignoring auto-join');
            }
            break;
    }
}

export default defineBackground(() => {
    log('Background script loaded');

    // Disable the extension action by default
    browser.action.disable();

    // Listen for messages from popup and content scripts
    browser.runtime.onMessage.addListener((message, sender) => {
        // Determine message source and handle accordingly
        if ('action' in message) {
            if (
                message.action === 'videoUpdate' ||
                message.action === 'ready' ||
                message.action === 'autoJoin'
            ) {
                handleContentScriptMessage(message as ContentToBackgroundMessage, sender);
            } else {
                handlePopupMessage(message as PopupToBackgroundMessage);
            }
        }
        return true; // Keep message channel open for async response
    });

    // Listen for tab removal to clean up
    browser.tabs.onRemoved.addListener((tabId) => {
        if (activeTabs.has(tabId)) {
            activeTabs.delete(tabId);
            log('Tab closed, removed from active tabs:', tabId);
        }
    });

    // Listen for tab URL changes to disable extension when navigating away
    browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.url && activeTabs.has(tabId)) {
            // Check if the new URL is still a supported site
            if (!isSupportedUrl(changeInfo.url)) {
                activeTabs.delete(tabId);
                browser.action.disable(tabId);
                log('Tab navigated away, disabled extension for tab:', tabId);
            }
        }
    });
});