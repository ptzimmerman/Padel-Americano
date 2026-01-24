# CLAUDE.md - AI Agent Context

## Project Overview

**Padel Americano Manager** - A React/TypeScript web app for managing Padel Americano tournaments. Americano is a social format where players rotate partners each round, ensuring everyone plays with and against different people.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Icons**: Lucide React
- **Deployment**: Vercel (preview links auto-generated on PR)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main React component - UI, state management, scoring |
| `types.ts` | TypeScript interfaces (Player, Match, Round, Tournament, LeaderboardEntry) |
| `utils/scheduler.ts` | **Core logic** - tournament schedules, additional rounds, championship |
| `index.tsx` | React entry point |
| `index.html` | HTML shell with Tailwind CDN |

## Architecture

### Scheduling Logic (`utils/scheduler.ts`)

The scheduler implements "Whist Tournament" logic:
1. **Perfect schedules** for 8, 12, 16 players (hardcoded, mathematically optimal)
2. **Fallback** Berger Table rotation for other player counts

**Key Functions**:
- `generateAmericanoSchedule()` - Creates initial tournament rounds
- `generateAdditionalRound()` - Adds fair rounds on-demand (prioritizes players with fewer matches)
- `generateChampionshipRound()` - Creates finals: 1st+3rd vs 2nd+4th

**Court Rotation**: The `optimizeCourtAssignments()` function ensures players rotate courts:
- Tracks player court history across rounds
- Uses round parity to force alternation when statistics tie
- Courts display in fixed order in UI (sorted by courtIndex)

### State Management

All state lives in `App.tsx` using React hooks:
- `players` - Array of registered players
- `tournament` - Active tournament data (rounds, scores, court names)
- `courtNames` - Custom court labels
- `currentRoundIndex` - Currently viewed round

**Persistence** (localStorage keys):
- `padel_players` - Player list
- `padel_tournament` - Full tournament state
- `padel_court_names` - Court names (before tournament starts)

### Scoring & Leaderboard

Points accumulate per-player across all rounds. Tiebreaker order:
1. Total points (higher better)
2. Match wins (higher better)
3. Point differential (points scored - points conceded)

### Championship System

- Championship match ID contains "championship" string (used for detection)
- Finals: 1st+3rd place team vs 2nd+4th place team
- Results show: Team champions, runner-up, and individual 1-4 rankings by total points

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm run preview # Preview production build
```

## Conventions

- Player counts of 8, 12, 16 are "perfect" and show a special badge
- Odd player counts get "bye" rounds where someone sits out
- Courts auto-number but can be renamed (Tab between inputs)
- Setup is locked once tournament starts (overlay + disabled inputs)
- "+" button to add rounds only appears on the last round
- Keyboard: Arrow keys navigate rounds (when not in input)

## Known Quirks

- The hardcoded schedules in `SCHEDULE_8` and `SCHEDULE_16` are verified optimal and should not be modified
- Court optimization uses brute-force permutation (fine for ≤4 courts)
- Championship detection uses `match.id.includes('championship')`
- PIN is stored internally for cloud sync but not displayed to users

## Future Enhancements

- [ ] Multiple tournament history
- [ ] Print-friendly bracket view
- [ ] Player profiles with persistent stats (Groups & Auth spec exists)
