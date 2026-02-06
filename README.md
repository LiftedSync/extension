# LiftedSync Chrome Extension

Chrome extension for synchronized video watching with friends across YouTube, Crunchyroll, Netflix, and Prime Video.

## Overview

LiftedSync allows multiple users to watch videos together in perfect sync. Create a room, share the code with friends, and enjoy synchronized playback - when one person plays, pauses, or seeks, everyone stays in sync.

### Features

- Create and join watch rooms with simple 4-character codes
- Automatic video synchronization (play, pause, seek)
- Support for YouTube, Crunchyroll, Netflix, and Prime Video
- Per-tab sync control (toggle individual tabs in/out of sync)
- Navigate together (send all room members to the same URL)
- Auto-join rooms via URL parameter (`?liftedSyncRoom=CODE`)
- Dark themed UI with modern design
- Real-time user presence

## Technology Stack

- **WXT** - Next-gen Web Extension Framework
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **TailwindCSS 3** - Utility-first CSS framework
- **shadcn/ui** - Accessible UI components
- **Radix UI** - Headless component primitives
- **Lucide React** - Icon library

## Project Structure

```
extension/
├── entrypoints/
│   ├── background.ts              # WebSocket & state management
│   ├── youtube.content.ts         # YouTube video controller
│   ├── crunchyroll.content.ts     # Crunchyroll video controller
│   ├── netflix.content.ts         # Netflix video controller
│   ├── primevideo.content.ts      # Prime Video video controller
│   └── popup/
│       ├── App.tsx                # Main popup application
│       ├── index.html             # Popup HTML entry
│       ├── main.tsx               # React entry point
│       └── pages/
│           ├── HomePage.tsx       # Create/Join options
│           ├── CreateRoomPage.tsx # Room creation form
│           ├── JoinRoomPage.tsx   # Room join form
│           └── RoomPage.tsx       # Connected room view
├── components/
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── config.ts                  # Backend URLs & constants
│   ├── types.ts                   # TypeScript interfaces
│   ├── messages.ts                # Message type definitions
│   ├── platforms.ts               # Platform URL detection & validation
│   ├── content-shared.ts          # Shared content script utilities
│   └── utils.ts                   # Tailwind class utilities
├── public/
│   ├── icon/                      # Extension icons (16, 32, 48, 128)
│   └── netflix-inject.js          # Netflix main-world inject script
├── styles/
│   └── globals.css                # Tailwind directives & theme
├── tailwind.config.cjs
├── postcss.config.cjs
└── wxt.config.ts                  # Extension manifest & config
```

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

The extension will be built to `.output/chrome-mv3/`.

**Load in Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` folder

The dev server supports hot reload - changes to popup and content scripts will update automatically.

### Production Build

```bash
# Build for Chrome (Manifest V3)
npm run build

# Build for Firefox (Manifest V2)
npm run build:firefox

# Create distributable zip file
npm run zip
npm run zip:firefox
```

Production builds are output to `.output/chrome-mv3/` or `.output/firefox-mv2/`.

## Configuration

### Backend URL

Edit `lib/config.ts` to configure the WebSocket server:

```typescript
export const config = {
  backendUrl: import.meta.env.DEV
       ? 'ws://localhost:8080/ws'
       : 'wss://liftedgang.de/api/ws', // Production
  DRIFT_TOLERANCE: 3,        // Sync if >3 seconds apart
  HEARTBEAT_INTERVAL: 20000, // Keep-alive every 20 seconds
};
```

### Extension Permissions

Configured in `wxt.config.ts`:

```typescript
manifest: {
  name: 'LiftedSync',
  permissions: ['storage', 'tabs'],
  host_permissions: [
    '*://www.youtube.com/*',
    '*://www.crunchyroll.com/*',
    '*://static.crunchyroll.com/*',
    '*://www.netflix.com/*',
    '*://www.primevideo.com/*',
    '*://www.amazon.com/gp/video/*',
    '*://www.amazon.de/gp/video/*',
  ],
  web_accessible_resources: [
    {
      resources: ['netflix-inject.js'],
      matches: ['*://www.netflix.com/*'],
    },
  ],
}
```

## Usage

1. **Start the backend server** (see sync-backend README)

2. **Create a Room**
   - Navigate to a supported video platform
   - Click the extension icon
   - Click "Create Room"
   - Enter your name and select platform
   - Share the 4-character room code with friends

3. **Join a Room**
   - Click the extension icon
   - Click "Join Room"
   - Enter your name and the room code
   - Navigate to the same video as the host

4. **Watch Together**
   - Play, pause, or seek - everyone stays in sync
   - Drift tolerance of 3 seconds prevents minor sync issues
   - Use "Navigate Together" to send all members to the same URL

## Platform Notes

- **YouTube** — Uses the standard HTML5 video element (`video.html5-main-video`).
- **Crunchyroll** — Runs in iframes (`allFrames: true`) to reach the embedded player.
- **Netflix** — Injects a script into the page's main world to access Netflix's internal player API for play/pause/seek control.
- **Prime Video** — Uses a smart video selector (largest visible `<video>` element) to distinguish the main player from background preview videos. Seeking while paused uses a play-seek-pause workaround since Prime Video's player ignores direct `currentTime` changes when paused.

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server for Chrome |
| `npm run dev:firefox` | Start dev server for Firefox |
| `npm run build` | Production build for Chrome |
| `npm run build:firefox` | Production build for Firefox |
| `npm run zip` | Create distributable zip for Chrome |
| `npm run zip:firefox` | Create distributable zip for Firefox |
| `npm run compile` | Type check without emitting |

## Sync Algorithm

The content scripts implement an "ignoreNext" pattern to prevent echo loops:

1. When receiving a remote update, set `ignoreNext[action] = true` (separate flags for `play`, `pause`, `timeupdate`, and `seeked`)
2. Apply the change to the video element
3. When the local event fires, check the corresponding `ignoreNext` flag and skip broadcasting
4. Only sync if time drift exceeds `DRIFT_TOLERANCE` (3 seconds)

## Troubleshooting

**Extension not detecting video:**
- Ensure you're on a supported video page (YouTube `/watch`, Netflix `/watch`, etc.)
- Refresh the page after installing the extension

**Sync not working:**
- Check that both users are in the same room (same room code)
- Verify the backend server is running
- Check the browser console (F12) for `[LiftedSync]` log messages

**Content script not loading:**
- Verify host permissions in manifest
- Try reloading the extension from `chrome://extensions`
