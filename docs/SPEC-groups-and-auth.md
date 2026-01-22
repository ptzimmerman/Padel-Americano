# Groups & Authentication Feature Spec

## Overview

Add persistent user accounts, groups, career stats, and skill-based matchmaking to the Padel Americano tournament manager.

## Goals

1. **User Authentication** - Google OAuth + Magic Link sign-in via Supabase
2. **Groups** - Create/join groups to organize regular playing partners
3. **Career Stats** - Track cumulative points, wins, losses per player per group
4. **Skill-Based Matchmaking** - Option to generate balanced teams based on player ratings
5. **Backwards Compatible** - App still works without signing in (local-only mode)

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Hosting | Cloudflare Pages (existing) |
| Auth | Supabase Auth (Google + Magic Link) |
| Database | Supabase Postgres |
| Ephemeral Sharing | Cloudflare KV (existing, 24hr TTL) |
| Frontend | React + TypeScript (existing) |

---

## Authentication

### Supported Methods

1. **Google OAuth** - Primary, one-click sign-in
2. **Magic Link** - Email-based, no password required

### Auth UI

```
┌─────────────────────────────────────────────┐
│                                             │
│            🎾 AMERICANO PADEL               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  G   Continue with Google           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│              ─── or ───                     │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  email@example.com                  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │      Send Magic Link                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  We'll email you a link to sign in.         │
│  No password needed.                        │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation

```typescript
// Google OAuth
await supabase.auth.signInWithOAuth({ 
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});

// Magic Link
await supabase.auth.signInWithOtp({ 
  email: userEmail,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
});
```

---

## Data Model

### Database Schema (Supabase Postgres)

```sql
-- =============================================
-- PLAYERS
-- Authenticated users only (no guest/placeholder players)
-- =============================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create player profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.players (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================
-- GROUPS
-- Collections of players who play together regularly
-- =============================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_by UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for invite code lookups
CREATE INDEX idx_groups_invite_code ON groups(invite_code);


-- =============================================
-- GROUP MEMBERSHIPS
-- Links players to groups with roles
-- =============================================
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, player_id)
);

-- Index for player's groups lookup
CREATE INDEX idx_group_members_player ON group_members(player_id);


-- =============================================
-- PLAYER GROUP STATS
-- Career statistics per player per group
-- =============================================
CREATE TABLE player_group_stats (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  ties INT DEFAULT 0,
  point_differential INT DEFAULT 0,
  skill_rating FLOAT DEFAULT 1000.0,  -- ELO-style rating
  tournaments_played INT DEFAULT 0,
  last_played TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (player_id, group_id)
);


-- =============================================
-- TOURNAMENTS
-- Historical record of tournaments played
-- =============================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT,
  created_by UUID REFERENCES players(id) ON DELETE SET NULL,
  matchup_type TEXT NOT NULL DEFAULT 'random' CHECK (matchup_type IN ('random', 'skill_based')),
  player_ids UUID[] NOT NULL,
  rounds JSONB NOT NULL,  -- Full tournament structure
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for group's tournaments
CREATE INDEX idx_tournaments_group ON tournaments(group_id);


-- =============================================
-- MATCH RESULTS
-- Individual match outcomes for granular stat tracking
-- =============================================
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round_index INT NOT NULL,
  court_index INT NOT NULL,
  team_a_players UUID[] NOT NULL,
  team_b_players UUID[] NOT NULL,
  score_a INT NOT NULL,
  score_b INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tournament's matches
CREATE INDEX idx_match_results_tournament ON match_results(tournament_id);


-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Players: Users can read all, update own
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Users can update own player" ON players FOR UPDATE USING (auth.uid() = user_id);

-- Groups: Members can read, owners/admins can update
CREATE POLICY "Group members can view groups" ON groups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = groups.id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Anyone can create groups" ON groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update groups" ON groups FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = groups.id AND p.user_id = auth.uid() AND gm.role = 'owner'
  ));

-- Group members: Viewable by group members, manageable by admins
CREATE POLICY "Group members can view memberships" ON group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = group_members.group_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM players WHERE id = player_id AND user_id = auth.uid())
);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM players WHERE id = player_id AND user_id = auth.uid()));

-- Stats: Viewable by group members
CREATE POLICY "Group members can view stats" ON player_group_stats FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = player_group_stats.group_id AND p.user_id = auth.uid()
  ));

-- Tournaments: Viewable by group members
CREATE POLICY "Group members can view tournaments" ON tournaments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = tournaments.group_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Group members can create tournaments" ON tournaments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_members gm 
    JOIN players p ON p.id = gm.player_id 
    WHERE gm.group_id = tournaments.group_id AND p.user_id = auth.uid()
  ));

-- Match results: Viewable by group members via tournament
CREATE POLICY "Match results viewable via tournament" ON match_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    JOIN group_members gm ON gm.group_id = t.group_id
    JOIN players p ON p.id = gm.player_id
    WHERE t.id = match_results.tournament_id AND p.user_id = auth.uid()
  ));
```

---

## User Flows

### Flow 1: Sign Up & Create Group

```
1. User lands on app
2. Clicks "Sign in with Google" (or enters email for magic link)
3. Authenticates → Player profile auto-created
4. Sees empty state: "Create or Join a Group"
5. Clicks "Create Group"
6. Enters group name: "Thursday Night Padel"
7. Group created, user is owner
8. Gets invite link: padel.lostnomadbrewing.com/join/abc123
```

### Flow 2: Join Group via Invite

```
1. User receives invite link
2. Opens padel.lostnomadbrewing.com/join/abc123
3. If not signed in → Sign in first
4. Sees: "Join Thursday Night Padel?"
5. Clicks "Join Group"
6. Added as member, redirected to group view
```

### Flow 3: Create Tournament with Skill-Based Matchups

```
1. User opens group view
2. Sees member list with skill ratings:
   - Pete ⭐ 1247
   - John ⭐ 1182
   - Sarah ⭐ 1156
   - Mike ⭐ 1089
   - Lisa ⭐ 1034
   - Tom ⭐ 998
   - Amy ⭐ 985
   - Chris ⭐ 952
3. Checks 8 players who are playing today
4. Selects matchup style:
   ○ Random
   ● Skill-based (balanced teams)
5. Clicks "Generate Tournament"
6. Algorithm pairs: Pete+Chris, John+Amy, Sarah+Tom, Mike+Lisa
   (highest + lowest for balanced teams)
7. Tournament begins
```

### Flow 4: Complete Tournament & Update Stats

```
1. All matches completed
2. User clicks "Save & Finish Tournament"
3. System processes results:
   - Updates total_points for each player
   - Updates wins/losses/ties
   - Updates point_differential
   - Recalculates skill_rating (ELO)
   - Increments tournaments_played
4. Group leaderboard updates
5. Tournament archived in history
```

---

## Skill-Based Matchmaking Algorithm

### Team Generation (Snake Draft)

```typescript
interface PlayerWithStats {
  id: string;
  displayName: string;
  skillRating: number;
}

function generateBalancedTeams(players: PlayerWithStats[]): [PlayerWithStats, PlayerWithStats][] {
  // Sort by skill rating (high to low)
  const sorted = [...players].sort((a, b) => b.skillRating - a.skillRating);
  
  const teams: [PlayerWithStats, PlayerWithStats][] = [];
  
  // Snake draft: pair highest with lowest
  while (sorted.length >= 2) {
    const top = sorted.shift()!;      // Best remaining
    const bottom = sorted.pop()!;     // Worst remaining
    teams.push([top, bottom]);
  }
  
  return teams;
}

// Example with 8 players (ratings: 1247, 1182, 1156, 1089, 1034, 998, 985, 952):
// Team 1: 1247 + 952 = 2199
// Team 2: 1182 + 985 = 2167
// Team 3: 1156 + 998 = 2154
// Team 4: 1089 + 1034 = 2123
// All teams within ~75 points of each other
```

### ELO Rating Update

```typescript
function updateSkillRatings(
  match: { teamA: string[], teamB: string[], scoreA: number, scoreB: number },
  playerStats: Map<string, { skillRating: number }>
): Map<string, number> {
  const K = 32; // ELO K-factor (higher = more volatile)
  
  // Calculate average team ratings
  const avgRatingA = average(match.teamA.map(id => playerStats.get(id)!.skillRating));
  const avgRatingB = average(match.teamB.map(id => playerStats.get(id)!.skillRating));
  
  // Expected scores (probability of winning)
  const expectedA = 1 / (1 + Math.pow(10, (avgRatingB - avgRatingA) / 400));
  const expectedB = 1 - expectedA;
  
  // Actual result (1 = win, 0.5 = tie, 0 = loss)
  const actualA = match.scoreA > match.scoreB ? 1 : match.scoreA === match.scoreB ? 0.5 : 0;
  const actualB = 1 - actualA;
  
  // Calculate new ratings
  const updates = new Map<string, number>();
  
  match.teamA.forEach(id => {
    const current = playerStats.get(id)!.skillRating;
    updates.set(id, current + K * (actualA - expectedA));
  });
  
  match.teamB.forEach(id => {
    const current = playerStats.get(id)!.skillRating;
    updates.set(id, current + K * (actualB - expectedB));
  });
  
  return updates;
}
```

---

## UI Components to Build

### New Pages/Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/auth` | `AuthPage` | Sign in (Google + Magic Link) |
| `/auth/callback` | `AuthCallback` | OAuth redirect handler |
| `/groups` | `GroupsPage` | List user's groups |
| `/groups/new` | `CreateGroupPage` | Create a new group |
| `/groups/:id` | `GroupDetailPage` | Group view, members, leaderboard |
| `/join/:code` | `JoinGroupPage` | Accept invite |

### Updated Components

| Component | Changes |
|-----------|---------|
| `App` | Add auth state, conditional rendering |
| `Tournament Generation` | Add player selection from group, matchup toggle |
| `Leaderboard` | Show career stats, skill ratings |

### New UI Elements

1. **Auth Modal** - Google button + email input for magic link
2. **Group Selector** - Dropdown to switch between groups
3. **Player Picker** - Checklist of group members for tournament
4. **Matchup Toggle** - Random vs Skill-based radio buttons
5. **Career Stats Card** - Player's all-time stats in a group
6. **Invite Link Copier** - One-click copy of invite URL

---

## API / Database Functions

### Supabase Edge Functions (if needed)

```typescript
// Update stats after tournament completion
// Could be a database trigger or edge function

async function processTournamentResults(tournamentId: string) {
  // 1. Get tournament with all matches
  // 2. For each match, calculate stat changes
  // 3. Update player_group_stats for each player
  // 4. Mark tournament as completed
}
```

### Database Triggers

```sql
-- Auto-initialize stats when player joins group
CREATE OR REPLACE FUNCTION init_player_group_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_group_stats (player_id, group_id)
  VALUES (NEW.player_id, NEW.group_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_group_member_added
  AFTER INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION init_player_group_stats();
```

---

## Migration Path

### Phase 1: Auth & Groups (This Feature)
- [ ] Set up Supabase project
- [ ] Configure Google OAuth
- [ ] Configure Magic Link
- [ ] Create database migrations
- [ ] Build auth UI
- [ ] Build groups CRUD
- [ ] Build invite flow

### Phase 2: Career Stats
- [ ] Add stats tracking on tournament completion
- [ ] Build career leaderboard UI
- [ ] Add skill rating display

### Phase 3: Skill-Based Matchmaking
- [ ] Implement balanced team algorithm
- [ ] Add matchup toggle to tournament generation
- [ ] Update ELO ratings after matches

---

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Google OAuth (configured in Supabase dashboard)
# - Client ID
# - Client Secret
# - Redirect URL: https://xxxxx.supabase.co/auth/v1/callback
```

---

## Open Questions

1. **Group limits?** - Max members per group? Max groups per user?
2. **Admin features?** - Can admins remove members? Edit stats?
3. **Historical data?** - How far back to show tournament history?
4. **Public profiles?** - Can players see each other's career stats across groups?
5. **Notifications?** - Email when invited to group? When tournament created?

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Supabase setup + migrations | 1-2 hours |
| Auth UI (Google + Magic Link) | 2-3 hours |
| Groups CRUD + invites | 3-4 hours |
| Tournament integration | 2-3 hours |
| Career stats + leaderboard | 2-3 hours |
| Skill-based matchmaking | 2-3 hours |
| Testing + polish | 2-3 hours |
| **Total** | **~15-20 hours** |
