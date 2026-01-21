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
| `utils/scheduler.ts` | **Core logic** - generates tournament schedules with court rotation |
| `index.tsx` | React entry point |
| `index.html` | HTML shell with Tailwind CDN |

## Architecture

### Scheduling Logic (`utils/scheduler.ts`)

The scheduler implements "Whist Tournament" logic:
1. **Perfect schedules** for 8, 12, 16 players (hardcoded, mathematically optimal)
2. **Fallback** Berger Table rotation for other player counts

**Court Rotation**: The `optimizeCourtAssignments()` function ensures players don't stay on the same court repeatedly. It:
- Tracks player court history across rounds
- Scores assignments by "staleness" (recent court = higher score)
- Picks the permutation with lowest total staleness

### State Management

All state lives in `App.tsx` using React hooks:
- `players` - Array of registered players
- `tournament` - Active tournament data (rounds, scores, court names)
- `courtNames` - Custom court labels
- Persisted to `localStorage` under `padel_players` and `padel_tournament`

### Scoring

Points accumulate per-player across all rounds. Current tiebreaker order:
1. Total points
2. Match wins
3. Matches played

**TODO**: Add "total game wins" as tiebreaker (sum of all individual game scores).

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
- Courts auto-number but can be renamed (e.g., "Center Court")
- The app is mobile-first with responsive breakpoints

## Known Quirks

- There's an Easter egg: player named "Pete" renders at 50% scale (see `PlayerName` component)
- The hardcoded schedules in `SCHEDULE_8` and `SCHEDULE_16` are verified optimal and should not be modified
- Court optimization uses brute-force permutation (fine for ≤4 courts, may need optimization for more)

## Future Enhancements

- [ ] Tie-breaking by total game wins
- [ ] Export/share tournament results
- [ ] Multiple tournament history
- [ ] Real-time sync between devices
