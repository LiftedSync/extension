import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription } from '@/components/ui/field';
import { ButtonGroup } from '@/components/ui/button-group';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {Copy, Check, LogOut, Users, ExternalLink, LayoutDashboard, MonitorPlay} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Platform, UserInfo } from '@/lib/types';
import type { PopupToBackgroundMessage, BackgroundToPopupMessage } from '@/lib/messages';
import { isValidUrlForPlatform, getPlatformLabel } from '@/lib/platforms';
import { buildShareUrl } from '@/lib/utils';

interface RoomPageProps {
  roomId: string;
  platform: Platform;
  users: UserInfo[];
  onLeaveRoom: () => void;
  activeTabId: number | null;
}

export function RoomPage({ roomId, platform, users, onLeaveRoom, activeTabId }: RoomPageProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [navigateUrl, setNavigateUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [isMatchingPlatform, setIsMatchingPlatform] = useState(false);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        setShareUrl(buildShareUrl(tab.url, roomId));
      }
    });
  }, [roomId]);

  // Query tab sync status on mount
  useEffect(() => {
    if (activeTabId === null) return;

    const handleMessage = (message: BackgroundToPopupMessage) => {
      if (message.action === 'tabSyncStatus') {
        setIsSynced(message.isSynced);
        setIsMatchingPlatform(message.isMatchingPlatform);
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    const msg: PopupToBackgroundMessage = { action: 'getTabSyncStatus', tabId: activeTabId };
    browser.runtime.sendMessage(msg).catch(console.error);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [activeTabId]);

  const handleToggleSync = (checked: boolean) => {
    if (activeTabId === null) return;
    setIsSynced(checked);
    const msg: PopupToBackgroundMessage = { action: 'toggleTabSync', tabId: activeTabId, enabled: checked };
    browser.runtime.sendMessage(msg).catch(console.error);
  };

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

      {/* Room Code & Tab Sync */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm font-medium flex items-center">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Room Code
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <div className="text-lg font-mono font-bold tracking-widest">
                {roomId}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                className="h-7 w-7"
              >
                {copiedCode ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center p-3">
          <CardTitle className="text-sm font-medium flex items-center mb-2">
            <MonitorPlay className="h-4 w-4 mr-2" />
            Tab Synced
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Switch
                    id="tab-sync"
                    checked={isSynced}
                    disabled={!isMatchingPlatform}
                    onCheckedChange={handleToggleSync}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!isMatchingPlatform
                  ? `Tab doesn't match ${getPlatformLabel(platform)}`
                  : isSynced
                    ? 'This tab is synced'
                    : 'This tab is not synced'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Card>
      </div>

      {/* Copy URL Button */}
      {shareUrl && (
        <Button
          onClick={handleCopyUrl}
          className="w-full mb-4"
        >
          {copiedUrl ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-500" />
              URL Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy URL
            </>
          )}
        </Button>
      )}

      {/* Users List */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col items-center gap-1 min-w-0"
              >
                <Avatar className="h-7 w-7 text-xs">
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                  {user.name}
                </span>
              </div>
            ))}
          </div>
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
