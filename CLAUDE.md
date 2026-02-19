# CLAUDE.md - AI Agent Context

## Project Overview

**Padel Americano Manager** - A React/TypeScript web app for managing Padel Americano tournaments. Americano is a social format where players rotate partners each round, ensuring everyone plays with and against different people.

**Live at**: https://padelme.io  
**Event subdomain**: totogi.padelme.io (Totogi Padel Invitational)

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Deployment**: Cloudflare Pages
- **Backend**: Cloudflare Pages Functions (serverless)
- **Storage**: Cloudflare Workers KV (24hr TTL, shared tournaments)
- **AI**: Anthropic Claude Haiku (nickname generation via `/api/nicknames`)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main React component - UI, state management, scoring, event mode |
| `types.ts` | TypeScript interfaces (Player, Match, Round, Tournament, LeaderboardEntry) |
| `utils/scheduler.ts` | **Core logic** - tournament schedules, skill-balanced event rounds, championship |
| `KioskView.tsx` | Tablet-friendly player check-in/out for event mode |
| `LeaderboardDisplay.tsx` | Standalone auto-refreshing leaderboard display |
| `GameViewer.tsx` | Read-only tournament viewer (polling) |
| `index.tsx` | React entry point + routing |
| `index.html` | HTML shell with Tailwind CDN, OG meta tags |
| `functions/api/game.ts` | POST - create shared tournament |
| `functions/api/game/[id].ts` | GET/PUT/DELETE - shared tournament CRUD |
| `functions/api/game/[id]/players.ts` | PATCH - kiosk player toggle/add (no PIN) |
| `functions/api/nicknames.ts` | POST - AI nickname generation |
| `functions/types.ts` | Shared API types, PIN hashing, ID generation |

## Architecture

### Two Tournament Modes

**Classic Mode** (default):
- All rounds pre-generated using Whist tournament logic
- Player roster locked after tournament starts
- Perfect schedules for 8, 12, 16 players

**Event Mode** (Totogi Padel Invitational — MWC Barcelona, Sunday March 1 2026):
- Expected 25-30 players, ~8 Totogi staff, 4 courts, games to 16
- Rounds generated one-at-a-time with skill-balanced matchmaking
- Players can be added/removed between rounds (kiosk supports AI nickname generation)
- `isTotogian` flag for sponsor players (grayed out, not eligible for prizes)
- `skillLevel` (low/medium/high) drives team balancing
- `isActive` toggle for round-by-round player pool management
- Dedicated kiosk and leaderboard display views
- Organizer app polls KV every 4s to pick up kiosk player additions/status changes

### Scheduling Logic (`utils/scheduler.ts`)

**Key Functions**:
- `generateAmericanoSchedule()` - Creates all rounds for classic mode
- `generateEventRound()` - Skill-balanced single round from active pool
- `generateAdditionalRound()` - Adds fair rounds on-demand
- `generateChampionshipRound()` - Creates finals: 1st+3rd vs 2nd+4th

**Skill Matching** (`generateEventRound`):
- low=1, medium=2, high=3
- Groups of 4 selected to balance total skill per match
- Team splits evaluated for skill equality + partnership/opponent history
- Avoids repeat partnerships and opponents

**Court Rotation**: `optimizeCourtAssignments()` ensures court variety.

### Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | App | Main tournament manager |
| `/game/:id` | GameViewer | Read-only viewer (polling) |
| `/kiosk/:id` | KioskView | Player self-service check-in |
| `/display/:id` | LeaderboardDisplay | Live leaderboard display |

### State Management

All state lives in `App.tsx` using React hooks.

**localStorage keys**:
- `padel_players` - Player list
- `padel_tournament` - Full tournament state
- `padel_court_names` - Court names
- `padel_share_state` - Sharing state (id, pin, url)
- `padel_event_mode` - Event mode flag
- `padel_event_courts` - Event court count

### Cloud Sharing

- Organizer creates shared tournament → POST `/api/game`
- Auto-syncs on every change → PUT `/api/game/:id` (debounced 500ms)
- Kiosk updates player status → PATCH `/api/game/:id/players` (no PIN)
- Viewers poll → GET `/api/game/:id` every 5s
- 24-hour TTL auto-cleanup

### Scoring & Leaderboard

Tiebreaker order: Total Points → Match Wins → Point Differential

**Event Mode Leaderboard**:
- Totogian players shown with reduced opacity
- Filter toggle: "All Players" vs "Prize View" (hides Totogians)
- Gold/silver/bronze medals skip Totogian players

### Branding (Event Mode)

- Purple theme (`bg-purple-600`, `bg-purple-950`)
- `public/totogi-padel-logo.png` - Padel Invitational badge
- `public/totogi-logo.png` - Totogi wordmark
- Header: "PADEL INVITATIONAL" + "Social Mixer"

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run preview # Preview production build
```

## Conventions

- Championship detection uses `match.id.includes('championship')`
- Event mode detected via `tournament.mode === 'event'`
- Kiosk/display views communicate only through KV (no localStorage)
- PIN stored internally for cloud sync but not displayed to users
- Hardcoded schedules in `SCHEDULE_8` and `SCHEDULE_16` are verified optimal

## Environment Variables (Cloudflare Pages)

- `ANTHROPIC_API_KEY` - For AI nickname generation (set in both Production and Preview)
- KV Namespace binding: `TOURNAMENTS`
