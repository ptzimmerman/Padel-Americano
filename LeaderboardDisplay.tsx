import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Tournament, LeaderboardEntry } from './types';
import { 
  Trophy, 
  Award,
  Loader2, 
  Info,
  Filter,
  Users
} from 'lucide-react';

const SKILL_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const POLL_INTERVAL = 5000;

const LeaderboardDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideTotogians, setHideTotogians] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/game/${id}`);
      if (!response.ok) {
        setError(response.status === 404 ? 'Tournament not found' : 'Failed to load');
        return;
      }
      const data = await response.json();
      setTournament(data.tournament);
      setError(null);
      setLastUpdated(new Date());
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
    const interval = setInterval(fetchTournament, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [id]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!tournament) return [];
    const stats: Record<string, LeaderboardEntry> = {};
    tournament.players.forEach(p => stats[p.id] = {
      playerId: p.id, playerName: p.name, playerNickname: p.nickname, isTotogian: p.isTotogian,
      totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0
    });

    tournament.rounds.forEach(r => r.matches.forEach(m => {
      if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
      const processTeam = (pIds: [string, string], s: number, os: number) => {
        pIds.forEach(pid => {
          if (!stats[pid]) return;
          stats[pid].totalPoints += s;
          stats[pid].pointDifferential += (s - os);
          stats[pid].matchesPlayed++;
          if (s > os) stats[pid].wins++;
          else if (s < os) stats[pid].losses++;
          else stats[pid].ties++;
        });
      };
      processTeam(m.teamA, m.scoreA, m.scoreB);
      processTeam(m.teamB, m.scoreB, m.scoreA);
    }));

    return Object.values(stats)
      .map(s => ({ ...s, avgPoints: s.matchesPlayed ? Number((s.totalPoints / s.matchesPlayed).toFixed(1)) : 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || b.pointDifferential - a.pointDifferential);
  }, [tournament]);

  const prizeLeaderboard = useMemo(() => leaderboard.filter(e => !e.isTotogian), [leaderboard]);
  const displayLeaderboard = hideTotogians ? prizeLeaderboard : leaderboard;
  const hasTotogians = leaderboard.some(e => e.isTotogian);
  const isEvent = tournament?.mode === 'event';

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md">
          <Info className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">{error || 'Not Found'}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950 font-inter antialiased">
      {/* Header */}
      <header className="bg-purple-900/50 border-b border-purple-800 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <img src="/totogi-padel-logo.png" alt="Totogi" className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl" />
            <div>
              <h1 className="text-base md:text-xl font-black text-white tracking-tight italic">
                <span className="text-purple-400">TOTOGI</span> PADEL
              </h1>
              <p className="text-purple-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Invitational — Live Leaderboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {hasTotogians && (
              <button
                onClick={() => setHideTotogians(!hideTotogians)}
                className={`flex items-center gap-1.5 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold transition-all ${
                  hideTotogians
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900 text-purple-400 border border-purple-700'
                }`}
              >
                <Filter className="w-3 h-3 md:w-4 md:h-4" />
                {hideTotogians ? 'Prize' : 'All'}
              </button>
            )}
            <div className="text-right">
              <div className="text-purple-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Rounds</div>
              <div className="text-xl md:text-2xl font-black text-white">{tournament.rounds.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Leaderboard */}
      <main className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-20">
        <div className="bg-purple-900/40 rounded-2xl md:rounded-3xl border border-purple-800/50 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-purple-800/50 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" /> Standings
            </h2>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
              <span className="text-purple-400 text-xs md:text-sm font-bold">{displayLeaderboard.length} players</span>
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-purple-800/20">
            {displayLeaderboard.map((entry, idx) => {
              const prizeRank = prizeLeaderboard.findIndex(e => e.playerId === entry.playerId);
              const displayRank = hideTotogians ? idx : leaderboard.findIndex(e => e.playerId === entry.playerId);

              const getRankStyle = () => {
                if (entry.isTotogian) return 'bg-purple-700/50 text-purple-400';
                const rank = isEvent ? prizeRank : displayRank;
                if (rank === 0) return 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30';
                if (rank === 1) return 'bg-slate-300 text-slate-700';
                if (rank === 2) return 'bg-orange-400 text-white';
                return 'bg-purple-800/50 text-purple-400';
              };

              const player = tournament.players.find(p => p.id === entry.playerId);
              const skill = player?.skillLevel || 'medium';

              return (
                <div key={entry.playerId} className={`flex items-center gap-3 px-4 py-3 ${entry.isTotogian ? 'opacity-40' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${getRankStyle()}`}>
                    {displayRank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-white text-sm italic uppercase truncate">{entry.playerName}</span>
                      {entry.isTotogian && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-purple-800 text-purple-400 shrink-0">T</span>
                      )}
                    </div>
                    {entry.playerNickname && (
                      <div className="text-purple-400 font-semibold text-[10px] truncate">"{entry.playerNickname}"</div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-[10px]">
                        <span className="text-emerald-400">{entry.wins}W</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-rose-400">{entry.losses}L</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-purple-500">{entry.ties}T</span>
                      </span>
                      <span className="text-[9px] text-purple-500 font-bold">{entry.matchesPlayed} games</span>
                      {isEvent && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                          {skill}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-2xl text-white italic tracking-tighter leading-none">{entry.totalPoints}</span>
                    <div className="text-[8px] text-purple-500 font-bold uppercase">pts</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <table className="hidden md:table w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-purple-500 uppercase tracking-widest border-b border-purple-800/30">
                <th className="px-6 py-3 w-16">#</th>
                <th className="px-6 py-3">Player</th>
                {isEvent && <th className="px-4 py-3 text-center">Skill</th>}
                <th className="px-6 py-3 text-center">Record</th>
                <th className="px-6 py-3 text-center">Games</th>
                <th className="px-6 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-800/20">
              {displayLeaderboard.map((entry, idx) => {
                const prizeRank = prizeLeaderboard.findIndex(e => e.playerId === entry.playerId);
                const displayRank = hideTotogians ? idx : leaderboard.findIndex(e => e.playerId === entry.playerId);
                
                const getRankStyle = () => {
                  if (entry.isTotogian) return 'bg-purple-700/50 text-purple-400';
                  const rank = isEvent ? prizeRank : displayRank;
                  if (rank === 0) return 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30';
                  if (rank === 1) return 'bg-slate-300 text-slate-700';
                  if (rank === 2) return 'bg-orange-400 text-white';
                  return 'bg-purple-800/50 text-purple-400';
                };
                
                return (
                  <tr key={entry.playerId} className={`transition-colors ${entry.isTotogian ? 'opacity-40' : 'hover:bg-purple-800/20'}`}>
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${getRankStyle()}`}>
                        {displayRank + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-lg italic uppercase">{entry.playerName}</span>
                        {entry.playerNickname && (
                          <span className="text-purple-400 font-semibold text-sm">"{entry.playerNickname}"</span>
                        )}
                        {entry.isTotogian && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-800 text-purple-400">Totogi</span>
                        )}
                      </div>
                    </td>
                    {isEvent && (
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const player = tournament.players.find(p => p.id === entry.playerId);
                          const skill = player?.skillLevel || 'medium';
                          return (
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                              {skill}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-black text-sm">
                        <span className="text-emerald-400">{entry.wins}W</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-rose-400">{entry.losses}L</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-purple-500">{entry.ties}T</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-purple-400 font-bold">{entry.matchesPlayed}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-3xl text-white italic tracking-tighter">{entry.totalPoints}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-purple-950/95 backdrop-blur-md border-t border-purple-800 px-4 md:px-6 py-2.5 md:py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-purple-400 text-[10px] md:text-xs font-bold">Live • Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <img src="/totogi-logo.png" alt="totogi" className="h-3 md:h-4 opacity-40" />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardDisplay;
