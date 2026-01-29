import type { Platform, VideoState, UserInfo } from './types';

// ============== Client -> Server Messages ==============

export interface JoinRoomMessage {
  type: 'join_room';
  roomId: string;
  userName: string;
}

export interface CreateRoomMessage {
  type: 'create_room';
  userName: string;
  platform: Platform;
}

export interface VideoUpdateMessage {
  type: 'video_update';
  state: VideoState;
  currentTime: number;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
}

export interface LeaveRoomMessage {
  type: 'leave_room';
}

export interface NavigateMessage {
  type: 'navigate';
  url: string;
}

export type ClientMessage =
  | JoinRoomMessage
  | CreateRoomMessage
  | VideoUpdateMessage
  | HeartbeatMessage
  | LeaveRoomMessage
  | NavigateMessage;

// ============== Server -> Client Messages ==============

export interface RoomJoinedMessage {
  type: 'room_joined';
  roomId: string;
  platform: Platform;
  state: VideoState;
  currentTime: number;
  users: UserInfo[];
}

export interface RoomCreatedMessage {
  type: 'room_created';
  roomId: string;
}

export interface SyncUpdateMessage {
  type: 'sync_update';
  state: VideoState;
  currentTime: number;
  fromUserId: string;
}

export interface UserJoinedMessage {
  type: 'user_joined';
  userName: string;
  userCount: number;
  users: UserInfo[];
}

export interface UserLeftMessage {
  type: 'user_left';
  userName: string;
  userCount: number;
  users: UserInfo[];
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export interface NavigateUpdateMessage {
  type: 'navigate_update';
  url: string;
  fromUserId: string;
}

export type ServerMessage =
  | RoomJoinedMessage
  | RoomCreatedMessage
  | SyncUpdateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | NavigateUpdateMessage;

// ============== Internal Extension Messages ==============
// Messages between popup, background, and content scripts

export type PopupToBackgroundMessage =
  | { action: 'createRoom'; userName: string; platform: Platform }
  | { action: 'joinRoom'; roomId: string; userName: string }
  | { action: 'leaveRoom' }
  | { action: 'getStatus' }
  | { action: 'navigate'; url: string }
  | { action: 'toggleTabSync'; tabId: number; enabled: boolean }
  | { action: 'getTabSyncStatus'; tabId: number };

export type BackgroundToPopupMessage =
  | { action: 'statusUpdate'; status: 'disconnected' | 'connecting' | 'connected' | 'error'; roomId?: string; platform?: Platform; users?: UserInfo[]; error?: string }
  | { action: 'roomCreated'; roomId: string }
  | { action: 'userUpdate'; users: UserInfo[] }
  | { action: 'tabSyncStatus'; isSynced: boolean; isMatchingPlatform: boolean };

export type BackgroundToContentMessage =
  | { action: 'syncUpdate'; state: VideoState; currentTime: number }
  | { action: 'connect'; roomId: string; platform: Platform }
  | { action: 'disconnect' }
  | { action: 'navigate'; url: string };

export type ContentToBackgroundMessage =
  | { action: 'videoUpdate'; state: VideoState; currentTime: number }
  | { action: 'ready' }
  | { action: 'autoJoin'; roomId: string };
