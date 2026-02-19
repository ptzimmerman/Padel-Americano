
export interface Player {
  id: string;
  name: string;
  nickname?: string;
  isTotogian?: boolean;
  skillLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
}

export interface Match {
  id: string;
  roundIndex: number;
  courtIndex: number;
  teamA: [string, string]; // Player IDs
  teamB: [string, string]; // Player IDs
  scoreA: number | null;
  scoreB: number | null;
  isCompleted: boolean;
}

export interface Round {
  index: number;
  matches: Match[];
  byes: string[]; // Player IDs sitting out
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
  isStarted: boolean;
  courtNames?: string[];
  mode?: 'classic' | 'event';
  numCourts?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerNickname?: string;
  isTotogian?: boolean;
  totalPoints: number;
  matchesPlayed: number;
  avgPoints: number;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
}
