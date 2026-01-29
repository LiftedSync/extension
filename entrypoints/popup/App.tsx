import { useState, useEffect, useCallback } from 'react';
import { HomePage } from './pages/HomePage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { RoomPage } from './pages/RoomPage';
import type { Platform, UserInfo, ConnectionStatus } from '@/lib/types';
import type { PopupToBackgroundMessage, BackgroundToPopupMessage } from '@/lib/messages';
import { detectPlatformFromUrl } from '@/lib/platforms';

type Page = 'home' | 'create' | 'join' | 'room';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [roomId, setRoomId] = useState<string>('');
  const [platform, setPlatform] = useState<Platform>('youtube');
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Detect platform from current tab URL and capture tab ID
  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.id) setActiveTabId(tab.id);
      const url = tab?.url;
      if (url) {
        const detected = detectPlatformFromUrl(url);
        if (detected) setDetectedPlatform(detected);
      }
    });
  }, []);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessage = (message: BackgroundToPopupMessage) => {
      console.log('Popup received message:', message);

      switch (message.action) {
        case 'statusUpdate':
          setStatus(message.status);
          if (message.status === 'connected' && message.roomId) {
            setRoomId(message.roomId);
            if (message.platform) setPlatform(message.platform);
            if (message.users) setUsers(message.users);
            setPage('room');
            setIsLoading(false);
            setError('');
          } else if (message.status === 'error') {
            setError(message.error || 'An error occurred');
            setIsLoading(false);
          } else if (message.status === 'disconnected') {
            setPage('home');
            setRoomId('');
            setUsers([]);
            setIsLoading(false);
          }
          break;

        case 'roomCreated':
          setRoomId(message.roomId);
          break;

        case 'userUpdate':
          setUsers(message.users);
          break;
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    // Request current status when popup opens
    const sendMessage = (msg: PopupToBackgroundMessage) => {
      browser.runtime.sendMessage(msg).catch(console.error);
    };
    sendMessage({ action: 'getStatus' });

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleCreateRoom = useCallback((userName: string, selectedPlatform: Platform) => {
    setIsLoading(true);
    setError('');
    setPlatform(selectedPlatform);
    const message: PopupToBackgroundMessage = {
      action: 'createRoom',
      userName,
      platform: selectedPlatform,
    };
    browser.runtime.sendMessage(message).catch((err) => {
      console.error('Failed to send createRoom message:', err);
      setError('Failed to create room');
      setIsLoading(false);
    });
  }, []);

  const handleJoinRoom = useCallback((joinRoomId: string, userName: string) => {
    setIsLoading(true);
    setError('');
    const message: PopupToBackgroundMessage = {
      action: 'joinRoom',
      roomId: joinRoomId,
      userName,
    };
    browser.runtime.sendMessage(message).catch((err) => {
      console.error('Failed to send joinRoom message:', err);
      setError('Failed to join room');
      setIsLoading(false);
    });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    const message: PopupToBackgroundMessage = { action: 'leaveRoom' };
    browser.runtime.sendMessage(message).catch(console.error);
    setPage('home');
    setRoomId('');
    setUsers([]);
    setStatus('disconnected');
  }, []);

  // Render current page
  switch (page) {
    case 'create':
      return (
        <CreateRoomPage
          onBack={() => setPage('home')}
          onCreateRoom={handleCreateRoom}
          isLoading={isLoading}
          initialPlatform={detectedPlatform}
        />
      );

    case 'join':
      return (
        <JoinRoomPage
          onBack={() => {
            setPage('home');
            setError('');
          }}
          onJoinRoom={handleJoinRoom}
          isLoading={isLoading}
          error={error}
        />
      );

    case 'room':
      return (
        <RoomPage
          roomId={roomId}
          platform={platform}
          users={users}
          onLeaveRoom={handleLeaveRoom}
          activeTabId={activeTabId}
        />
      );

    default:
      return (
        <HomePage
          onCreateRoom={() => setPage('create')}
          onJoinRoom={() => setPage('join')}
        />
      );
  }
}

export default App;
