// Platform and state enums
export type Platform = 'youtube' | 'crunchyroll' | 'netflix' | 'primevideo';
export type VideoState = 'playing' | 'paused';

// User info
export interface UserInfo {
  id: string;
  name: string;
}

// Room state for the popup
export interface RoomState {
  roomId: string;
  platform: Platform;
  state: VideoState;
  currentTime: number;
  users: UserInfo[];
  connected: boolean;
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
