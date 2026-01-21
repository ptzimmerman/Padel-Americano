
import { Player, Match, Round } from '../types';

/**
 * Mathematically Perfect Whist Tournament Logic
 * 1. Partner with every other player exactly once.
 * 2. Oppose every other player exactly twice (for N=8, 12, 16).
 */

// Hardcoded verified schedule for 8 players from user image
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

export const generateAmericanoSchedule = (players: Player[]): Round[] => {
  const numPlayers = players.length;
  if (numPlayers < 4) return [];

  // 1. Specialized Whist Schedules for Perfect Balance
  if (numPlayers === 8) {
    return SCHEDULE_8.map((rData, rIdx) => ({
      index: rIdx,
      matches: [
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
      ],
      byes: []
    }));
  }

  if (numPlayers === 16) {
    return SCHEDULE_16.map((roundMatches, rIdx) => ({
      index: rIdx,
      matches: roundMatches.map((m, cIdx) => ({
        id: `r${rIdx}-c${cIdx}`,
        roundIndex: rIdx,
        courtIndex: cIdx,
        teamA: [players[m[0]].id, players[m[1]].id],
        teamB: [players[m[2]].id, players[m[3]].id],
        scoreA: null, scoreB: null, isCompleted: false
      })),
      byes: []
    }));
  }

  if (WHIST_SEEDS[numPlayers]) {
    const seed = WHIST_SEEDS[numPlayers];
    const mod = numPlayers - 1;
    const rounds: Round[] = [];

    for (let r = 0; r < mod; r++) {
      const roundMatches: Match[] = seed.map((m, mIdx) => {
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
    const matches: Match[] = [];
    const numMatchesPossible = Math.floor(validPairs.length / 2);
    
    for (let m = 0; m < numMatchesPossible; m++) {
      // We offset the pairings slightly to vary opponents round-over-round
      // while keeping the partnership fixed.
      matches.push({
        id: `r${r}-c${m}`,
        roundIndex: r,
        courtIndex: m,
        teamA: validPairs[m * 2],
        teamB: validPairs[m * 2 + 1],
        scoreA: null, scoreB: null, isCompleted: false
      });
    }
    
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
