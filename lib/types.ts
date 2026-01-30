// Platform and state enums
export type Platform = 'youtube' | 'crunchyroll' | 'netflix' | 'primevideo';
export type VideoState = 'playing' | 'paused';

// User info
export interface UserInfo {
  id: string;
  name: string;
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
