import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription } from '@/components/ui/field';
import { ButtonGroup } from '@/components/ui/button-group';
import {Copy, Check, LogOut, Users, ExternalLink, LayoutDashboard} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Platform, UserInfo } from '@/lib/types';
import type { PopupToBackgroundMessage } from '@/lib/messages';
import { isValidUrlForPlatform, getPlatformLabel } from '@/lib/platforms';

interface RoomPageProps {
  roomId: string;
  platform: Platform;
  users: UserInfo[];
  onLeaveRoom: () => void;
}

export function RoomPage({ roomId, platform, users, onLeaveRoom }: RoomPageProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [navigateUrl, setNavigateUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        try {
          const url = new URL(tab.url);
          url.searchParams.delete('liftedSyncRoom');
          url.searchParams.set('liftedSyncRoom', roomId);
          setShareUrl(url.toString());
        } catch {
          // Invalid URL, skip
        }
      }
    });
  }, [roomId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNavigate = () => {
    setUrlError(null);

    if (!navigateUrl.trim()) {
      setUrlError('Please enter a URL');
      return;
    }

    if (!isValidUrlForPlatform(navigateUrl, platform)) {
      setUrlError(`URL must be a ${getPlatformLabel(platform)} link`);
      return;
    }

    const message: PopupToBackgroundMessage = {
      action: 'navigate',
      url: navigateUrl.trim(),
    };
    browser.runtime.sendMessage(message);
    setNavigateUrl('');
  };

  const platformLabel = getPlatformLabel(platform);

  return (
    <div className="flex flex-col min-h-[350px] p-6">
      {/* Header with title and leave button */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">Connected</h1>
          <p className="text-sm text-muted-foreground">
            Watching on {platformLabel}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeaveRoom}
          className="h-8 px-2"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Room Details Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Room Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Room Code with copy button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xl font-mono font-bold tracking-widest">
                {roomId}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyCode}
              className="h-8 w-8"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Copy URL Button */}
          {shareUrl && (
            <Button
              variant="outline"
              onClick={handleCopyUrl}
              className="w-full"
            >
              {copiedUrl ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  URL Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Share URL
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Avatar className="h-5 w-5 text-xs">
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                {user.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Navigate Together */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <ExternalLink className="h-4 w-4 mr-2" />
            Navigate Together
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Field invalid={!!urlError}>
            <ButtonGroup className="w-full">
              <Input
                placeholder={`Enter ${platformLabel} URL...`}
                value={navigateUrl}
                onChange={(e) => {
                  setNavigateUrl(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNavigate();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleNavigate}>
                Go
              </Button>
            </ButtonGroup>
            {urlError && (
              <FieldDescription>{urlError}</FieldDescription>
            )}
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
