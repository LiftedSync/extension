# LiftedSync Chrome Extension

Chrome extension for synchronized YouTube and Crunchyroll video watching with friends.

## Overview

LiftedSync allows multiple users to watch videos together in perfect sync. Create a room, share the code with friends, and enjoy synchronized playback - when one person plays, pauses, or seeks, everyone stays in sync.

### Features

- Create and join watch rooms with simple 6-character codes
- Automatic video synchronization (play, pause, seek)
- Support for YouTube and Crunchyroll
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
sync-frontend/
├── entrypoints/
│   ├── background.ts              # WebSocket & state management
│   ├── youtube.content.ts         # YouTube video controller
│   ├── crunchyroll.content.ts     # Crunchyroll video controller
│   └── popup/
│       ├── App.tsx                # Main popup application
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
│   ├── content-shared.ts          # Shared content script utilities
│   └── utils.ts                   # Tailwind class utilities
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
  ],
}
```

## Usage

1. **Start the backend server** (see sync-backend README)

2. **Create a Room**
   - Click the extension icon
   - Click "Create Room"
   - Enter your name and select platform (YouTube/Crunchyroll)
   - Share the 6-character room code with friends

3. **Join a Room**
   - Click the extension icon
   - Click "Join Room"
   - Enter your name and the room code
   - Navigate to the same video as the host

4. **Watch Together**
   - Play, pause, or seek - everyone stays in sync
   - Drift tolerance of 3 seconds prevents minor sync issues

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server for Chrome |
| `npm run dev:firefox` | Start dev server for Firefox |
| `npm run build` | Production build for Chrome |
| `npm run build:firefox` | Production build for Firefox |
| `npm run zip` | Create distributable zip |
| `npm run compile` | Type check without emitting |

## Sync Algorithm

The content scripts implement an "ignoreNext" pattern to prevent echo loops:

1. When receiving a remote update, set `ignoreNext[action] = true`
2. Apply the change to the video element
3. When the local event fires, check `ignoreNext` and skip broadcasting
4. Only sync if time drift exceeds `DRIFT_TOLERANCE` (3 seconds)

## Troubleshooting

**Extension not detecting video:**
- Ensure you're on a YouTube watch page (`/watch`) or Crunchyroll video page
- Refresh the page after installing the extension

**Sync not working:**
- Check that both users are in the same room (same room code)
- Verify the backend server is running (`ws://localhost:8080/ws`)
- Check the browser console (F12) for error messages

**Content script not loading:**
- Verify host permissions in manifest
- Try reloading the extension from `chrome://extensions`
