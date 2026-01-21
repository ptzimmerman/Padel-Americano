import { Player, Match, Round } from '../types.ts';

/**
 * Mathematically Perfect Whist Tournament Logic
 * 1. Partner with every other player exactly once.
 * 2. Oppose every other player exactly twice (for N=8, 12, 16).
 * 
 * Enhanced with Court Rotation:
 * - Track which courts each player has been on
 * - Optimize court assignments to maximize variety
 */

// Hardcoded verified schedule for 8 players from user image
// Format: { t1: [court1_teamA_p1, court1_teamA_p2, court1_teamB_p1, court1_teamB_p2], 
//           t2: [court2_teamA_p1, court2_teamA_p2, court2_teamB_p1, court2_teamB_p2] }
const SCHEDULE_8 = [
  { t1: [0, 1, 2, 5], t2: [3, 6, 4, 7] },
  { t1: [0, 2, 3, 7], t2: [1, 5, 4, 6] },
  { t1: [0, 3, 1, 6], t2: [2, 7, 4, 5] },
  { t1: [0, 4, 2, 6], t2: [1, 7, 3, 5] },
  { t1: [0, 5, 3, 4], t2: [1, 2, 6, 7] },
  { t1: [0, 6, 5, 7], t2: [1, 3, 2, 4] },
  { t1: [0, 7, 1, 4], t2: [2, 3, 5, 6] }
];

// Hardcoded verified schedule for 16 players from provided user images
const SCHEDULE_16 = [
  [[3, 8, 5, 1], [11, 0, 2, 6], [10, 14, 12, 7], [13, 9, 4, 15]], // R1
  [[0, 9, 13, 11], [3, 10, 14, 8], [15, 6, 2, 4], [12, 5, 1, 7]], // R2
  [[4, 7, 1, 2], [5, 6, 15, 12], [13, 14, 8, 11], [3, 0, 9, 10]], // R3
  [[15, 9, 10, 12], [2, 11, 8, 1], [3, 5, 6, 0], [14, 7, 4, 13]], // R4
  [[3, 14, 7, 5], [4, 6, 0, 13], [9, 11, 2, 15], [1, 12, 10, 8]], // R5
  [[6, 12, 1, 4], [3, 9, 11, 14], [8, 13, 0, 10], [2, 7, 5, 15]], // R6
  [[10, 15, 5, 0], [7, 13, 8, 2], [1, 11, 14, 4], [3, 6, 12, 9]], // R7
  [[8, 12, 9, 2], [0, 4, 14, 5], [3, 7, 13, 6], [11, 15, 10, 1]], // R8
  [[3, 11, 15, 7], [10, 13, 6, 1], [12, 4, 0, 8], [5, 2, 9, 14]], // R9
  [[13, 2, 5, 10], [3, 12, 4, 11], [14, 1, 6, 9], [0, 15, 7, 8]], // R10
  [[9, 8, 7, 6], [15, 1, 14, 0], [5, 4, 11, 10], [3, 13, 2, 12]], // R11
  [[14, 2, 12, 0], [6, 10, 11, 7], [3, 15, 1, 13], [4, 8, 9, 5]], // R12
  [[3, 4, 8, 15], [9, 1, 13, 5], [2, 10, 6, 14], [7, 0, 12, 11]], // R13
  [[1, 0, 7, 9], [3, 2, 10, 4], [11, 5, 13, 12], [6, 8, 15, 14]], // R14
  [[12, 14, 15, 13], [8, 5, 11, 6], [7, 10, 4, 9], [3, 1, 0, 2]]  // R15
];

/**
 * Z-Cyclic Seeds for N=12
 * [FixedPlayer, Partner, Opponent1, Opponent2]
 */
const WHIST_SEEDS: Record<number, number[][]> = {
  12: [
    [11, 0, 8, 9], // (12-1) vs (9-10)
    [1, 7, 2, 5],  // (2-8) vs (3-6)
    [3, 10, 4, 6]  // (4-11) vs (5-7)
  ]
};

/**
 * Optimize court assignments to maximize variety for each player.
 * Players should play on different courts as much as possible.
 * 
 * The Whist schedule is perfectly balanced, so statistical approaches
 * often result in ties. We use a simple, deterministic approach:
 * 
 * 1. Try to minimize players staying on the same court as last round
 * 2. When tied (common with balanced schedules), use round parity to alternate
 */
const optimizeCourtAssignments = (
  matches: Match[],
  playerCourtHistory: Map<string, number[]>
): Match[] => {
  if (matches.length <= 1) return matches;

  const getPlayersInMatch = (m: Match) => [...m.teamA, ...m.teamB];
  const numCourts = matches.length;
  
  /**
   * Count players who would stay on the same court as their last round
   * Lower is better (we want movement)
   */
  const countPlayersStaying = (perm: number[]): number => {
    let staying = 0;
    for (let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
      const courtIdx = perm[matchIdx];
      for (const playerId of getPlayersInMatch(matches[matchIdx])) {
        const history = playerCourtHistory.get(playerId) || [];
        if (history.length > 0 && history[history.length - 1] === courtIdx) {
          staying++;
        }
      }
    }
    return staying;
  };

  // Generate all permutations of court indices
  const permute = (arr: number[]): number[][] => {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of permute(rest)) {
        result.push([arr[i], ...perm]);
      }
    }
    return result;
  };

  const courtIndices = Array.from({ length: numCourts }, (_, i) => i);
  const allPermutations = permute(courtIndices);
  
  // Find permutation(s) with minimum players staying
  let minStaying = Infinity;
  const bestPermutations: number[][] = [];
  
  for (const perm of allPermutations) {
    const staying = countPlayersStaying(perm);
    if (staying < minStaying) {
      minStaying = staying;
      bestPermutations.length = 0;
      bestPermutations.push(perm);
    } else if (staying === minStaying) {
      bestPermutations.push(perm);
    }
  }

  // Tiebreaker: Use round number (history length) to alternate deterministically
  // This ensures consistent rotation even when statistics are balanced
  const roundNumber = playerCourtHistory.values().next().value?.length || 0;
  
  // For 2 courts: alternate between [0,1] and [1,0] based on round parity
  // For more courts: cycle through permutations
  let bestPermutation: number[];
  
  if (bestPermutations.length === 1) {
    bestPermutation = bestPermutations[0];
  } else {
    // Multiple tied permutations - use round number to pick deterministically
    // This creates a predictable alternation pattern
    const permIndex = roundNumber % bestPermutations.length;
    bestPermutation = bestPermutations[permIndex];
  }

  // Apply the best permutation
  return matches.map((match, idx) => ({
    ...match,
    courtIndex: bestPermutation[idx],
    id: match.id.replace(/c\d+$/, `c${bestPermutation[idx]}`)
  }));
};

/**
 * Update player court history after optimizing a round
 */
const updateCourtHistory = (
  matches: Match[],
  history: Map<string, number[]>
): void => {
  for (const match of matches) {
    for (const playerId of [...match.teamA, ...match.teamB]) {
      const playerHistory = history.get(playerId) || [];
      playerHistory.push(match.courtIndex);
      history.set(playerId, playerHistory);
    }
  }
};

export const generateAmericanoSchedule = (players: Player[]): Round[] => {
  const numPlayers = players.length;
  if (numPlayers < 4) return [];

  // Track player court history for rotation optimization
  const playerCourtHistory = new Map<string, number[]>();

  // 1. Specialized Whist Schedules for Perfect Balance
  if (numPlayers === 8) {
    const rounds: Round[] = [];
    
    for (let rIdx = 0; rIdx < SCHEDULE_8.length; rIdx++) {
      const rData = SCHEDULE_8[rIdx];
      let matches: Match[] = [
        {
          id: `r${rIdx}-c0`,
          roundIndex: rIdx,
          courtIndex: 0,
          teamA: [players[rData.t1[0]].id, players[rData.t1[1]].id],
          teamB: [players[rData.t1[2]].id, players[rData.t1[3]].id],
          scoreA: null, scoreB: null, isCompleted: false
        },
        {
          id: `r${rIdx}-c1`,
          roundIndex: rIdx,
          courtIndex: 1,
          teamA: [players[rData.t2[0]].id, players[rData.t2[1]].id],
          teamB: [players[rData.t2[2]].id, players[rData.t2[3]].id],
          scoreA: null, scoreB: null, isCompleted: false
        }
      ];
      
      // Optimize court assignments based on history
      matches = optimizeCourtAssignments(matches, playerCourtHistory);
      updateCourtHistory(matches, playerCourtHistory);
      
      rounds.push({ index: rIdx, matches, byes: [] });
    }
    
    return rounds;
  }

  if (numPlayers === 16) {
    const rounds: Round[] = [];
    
    for (let rIdx = 0; rIdx < SCHEDULE_16.length; rIdx++) {
      const roundMatches = SCHEDULE_16[rIdx];
      let matches: Match[] = roundMatches.map((m, cIdx) => ({
        id: `r${rIdx}-c${cIdx}`,
        roundIndex: rIdx,
        courtIndex: cIdx,
        teamA: [players[m[0]].id, players[m[1]].id],
        teamB: [players[m[2]].id, players[m[3]].id],
        scoreA: null, scoreB: null, isCompleted: false
      }));
      
      // Optimize court assignments based on history
      matches = optimizeCourtAssignments(matches, playerCourtHistory);
      updateCourtHistory(matches, playerCourtHistory);
      
      rounds.push({ index: rIdx, matches, byes: [] });
    }
    
    return rounds;
  }

  if (WHIST_SEEDS[numPlayers]) {
    const seed = WHIST_SEEDS[numPlayers];
    const mod = numPlayers - 1;
    const rounds: Round[] = [];

    for (let r = 0; r < mod; r++) {
      let roundMatches: Match[] = seed.map((m, mIdx) => {
        const getPlayerId = (idx: number) => {
          if (idx === numPlayers - 1) return players[numPlayers - 1].id;
          return players[(idx + r) % mod].id;
        };
        return {
          id: `r${r}-c${mIdx}`,
          roundIndex: r,
          courtIndex: mIdx,
          teamA: [getPlayerId(m[0]), getPlayerId(m[1])],
          teamB: [getPlayerId(m[2]), getPlayerId(m[3])],
          scoreA: null, scoreB: null, isCompleted: false,
        };
      });
      
      // Optimize court assignments based on history
      roundMatches = optimizeCourtAssignments(roundMatches, playerCourtHistory);
      updateCourtHistory(roundMatches, playerCourtHistory);
      
      rounds.push({ index: r, matches: roundMatches, byes: [] });
    }
    return rounds;
  }

  // 2. Fallback: Proper Circle Rotation (Berger Tables) for Pairing
  // Guarantees every player partners with everyone else exactly once.
  const isOdd = numPlayers % 2 !== 0;
  const n = isOdd ? numPlayers + 1 : numPlayers;
  const rounds: Round[] = [];
  
  // Create indices 0 to n-1 (if odd, n-1 is the Ghost)
  const indices = Array.from({ length: n }, (_, i) => i);
  
  for (let r = 0; r < n - 1; r++) {
    const validPairs: [string, string][] = [];
    const roundByes: string[] = [];
    
    for (let i = 0; i < n / 2; i++) {
      const idx1 = indices[i];
      const idx2 = indices[n - 1 - i];
      
      const p1 = idx1 < numPlayers ? players[idx1] : null;
      const p2 = idx2 < numPlayers ? players[idx2] : null;
      
      if (p1 && p2) {
        validPairs.push([p1.id, p2.id]);
      } else {
        // If one is null, the other is sitting out this round
        if (p1) roundByes.push(p1.id);
        if (p2) roundByes.push(p2.id);
      }
    }
    
    // Distribute the valid pairs into matches
    let matches: Match[] = [];
    const numMatchesPossible = Math.floor(validPairs.length / 2);
    
    for (let m = 0; m < numMatchesPossible; m++) {
      matches.push({
        id: `r${r}-c${m}`,
        roundIndex: r,
        courtIndex: m,
        teamA: validPairs[m * 2],
        teamB: validPairs[m * 2 + 1],
        scoreA: null, scoreB: null, isCompleted: false
      });
    }
    
    // Optimize court assignments based on history
    matches = optimizeCourtAssignments(matches, playerCourtHistory);
    updateCourtHistory(matches, playerCourtHistory);
    
    // Leftover pairs become byes
    if (validPairs.length % 2 !== 0) {
      const lastPair = validPairs[validPairs.length - 1];
      roundByes.push(...lastPair);
    }
    
    rounds.push({ index: r, matches, byes: roundByes });
    
    // Rotate indices for next round (fix the first element, rotate others)
    const last = indices.pop()!;
    indices.splice(1, 0, last);
  }

  return rounds;
};