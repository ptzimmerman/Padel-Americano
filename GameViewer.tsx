import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tournament, LeaderboardEntry, Match } from './types';
import { 
  Trophy, 
  Layout, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Award,
  ShieldCheck,
  Zap,
  RefreshCw,
  Loader2,
  Home,
  Eye
} from 'lucide-react';

interface SharedTournamentData {
  id: string;
  tournament: Tournament;
  createdAt: string;
  expiresAt: string;
}

const POLL_INTERVAL = 5000; // 5 seconds

const GameViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SharedTournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'rounds' | 'leaderboard'>('rounds');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/game/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Tournament not found or has expired');
        } else {
          setError('Failed to load tournament');
        }
        return;
      }
      const result = await response.json();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
    
    // Poll for updates
    const interval = setInterval(fetchTournament, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [id]);

  const tournament = data?.tournament;

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!tournament) return [];
    const stats: Record<string, LeaderboardEntry> = {};
    tournament.players.forEach(p => stats[p.id] = {
      playerId: p.id, playerName: p.name, totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0
    });

    tournament.rounds.forEach(r => r.matches.forEach(m => {
      if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
      const processTeam = (pIds: [string, string], s: number, os: number) => {
        pIds.forEach(id => {
          if (!stats[id]) return;
          stats[id].totalPoints += s;
          stats[id].pointDifferential += (s - os);
          stats[id].matchesPlayed++;
          if (s > os) stats[id].wins++;
          else if (s < os) stats[id].losses++;
          else stats[id].ties++;
        });
      };
      processTeam(m.teamA, m.scoreA, m.scoreB);
      processTeam(m.teamB, m.scoreB, m.scoreA);
    }));

    return Object.values(stats)
      .map(s => ({ ...s, avgPoints: s.matchesPlayed ? Number((s.totalPoints / s.matchesPlayed).toFixed(1)) : 0 }))
      .sort((a, b) => 
        b.totalPoints - a.totalPoints || 
        b.wins - a.wins || 
        b.pointDifferential - a.pointDifferential
      );
  }, [tournament]);

  const getCourtName = (courtIndex: number): string => {
    if (tournament?.courtNames?.[courtIndex]) {
      return tournament.courtNames[courtIndex];
    }
    return `Court ${courtIndex + 1}`;
  };

  const PlayerName = ({ name, baseClass }: { name: string, baseClass: string }) => (
    <span className={baseClass}>{name}</span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 md:p-12 text-center max-w-md">
          <div className="bg-rose-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Info className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-3">{error || 'Tournament not found'}</h1>
          <p className="text-slate-500 mb-6">This tournament may have expired or the link is invalid.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
            <Home className="w-5 h-5" /> Create Your Own
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24 font-inter antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <Zap className="w-5 h-5" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight italic">
                AMERICANO<span className="text-indigo-600">PADEL</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                <Eye className="w-3 h-3" /> Viewing Live
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchTournament()} 
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="text-[10px] text-slate-400 font-bold">
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-[72px] z-40">
        <div className="max-w-6xl mx-auto px-4 flex gap-2">
          {[
            { tab: 'rounds', icon: Layout, label: 'Matches' },
            { tab: 'leaderboard', icon: Trophy, label: 'Standings' }
          ].map(item => (
            <button 
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] ${
                activeTab === item.tab 
                  ? 'text-indigo-600 border-indigo-600' 
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'rounds' && (
          <div className="space-y-6">
            {/* Round Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
              <button 
                disabled={currentRoundIndex === 0} 
                onClick={() => setCurrentRoundIndex(i => i - 1)} 
                className="p-3 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={3} />
              </button>
              <div className="text-center">
                {tournament.rounds[currentRoundIndex]?.matches.some(m => m.id.includes('championship')) ? (
                  <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1 mb-1">
                    <Trophy className="w-3 h-3" /> Finals
                  </div>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Round</span>
                )}
                <div className="text-3xl font-black text-slate-900">
                  {currentRoundIndex + 1}<span className="text-slate-300 text-base font-bold">/ {tournament.rounds.length}</span>
                </div>
              </div>
              <button 
                disabled={currentRoundIndex === tournament.rounds.length - 1} 
                onClick={() => setCurrentRoundIndex(i => i + 1)} 
                className="p-3 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0"
              >
                <ChevronRight className="w-6 h-6" strokeWidth={3} />
              </button>
            </div>

            {/* Matches */}
            <div className="grid gap-4">
              {(tournament.rounds[currentRoundIndex]?.matches || [])
                .slice()
                .sort((a, b) => a.courtIndex - b.courtIndex)
                .map((match) => {
                const getP = (pid: string) => tournament.players.find(p => p.id === pid)?.name || 'Unknown';
                const teamAWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB;
                const teamBWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA;
                const winnerClass = "text-emerald-600";
                
                return (
                  <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`px-4 py-2 border-b flex justify-between items-center text-[9px] font-black uppercase tracking-widest ${
                      match.id.includes('championship') 
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700' 
                        : 'bg-slate-50/50 border-slate-100 text-slate-400'
                    }`}>
                      <span className="flex items-center gap-1">
                        {match.id.includes('championship') && <Trophy className="w-3 h-3 text-yellow-500" />}
                        {match.id.includes('championship') ? 'Finals' : getCourtName(match.courtIndex)}
                      </span>
                      {match.isCompleted && <span className="text-emerald-500 flex items-center gap-1"><ShieldCheck size={10}/> Done</span>}
                    </div>
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 text-right space-y-0.5">
                        <PlayerName name={getP(match.teamA[0])} baseClass={`text-base font-black italic block ${teamAWon ? winnerClass : 'text-slate-900'}`} />
                        <PlayerName name={getP(match.teamA[1])} baseClass={`text-base font-black italic block ${teamAWon ? winnerClass : 'text-slate-900'}`} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 flex items-center justify-center text-2xl font-black rounded-xl ${
                          teamAWon ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {match.scoreA ?? '-'}
                        </div>
                        <span className="text-slate-200 font-bold text-xs">VS</span>
                        <div className={`w-12 h-12 flex items-center justify-center text-2xl font-black rounded-xl ${
                          teamBWon ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {match.scoreB ?? '-'}
                        </div>
                      </div>
                      <div className="flex-1 text-left space-y-0.5">
                        <PlayerName name={getP(match.teamB[0])} baseClass={`text-base font-black italic block ${teamBWon ? winnerClass : 'text-slate-900'}`} />
                        <PlayerName name={getP(match.teamB[1])} baseClass={`text-base font-black italic block ${teamBWon ? winnerClass : 'text-slate-900'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Byes */}
            {tournament.rounds[currentRoundIndex]?.byes.length > 0 && (
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                <h3 className="text-amber-700 font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4"/> Resting
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tournament.rounds[currentRoundIndex].byes.map(bid => (
                    <div key={bid} className="bg-white px-3 py-2 rounded-xl shadow-sm border border-amber-200">
                      <PlayerName name={tournament.players.find(p => p.id === bid)?.name || ''} baseClass="font-black text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {/* Championship Results */}
            {(() => {
              const championshipRound = tournament.rounds.find(r => 
                r.matches.some(m => m.id.includes('championship'))
              );
              const championshipMatch = championshipRound?.matches.find(m => m.id.includes('championship'));
              
              if (!championshipMatch?.isCompleted || championshipMatch.scoreA === null || championshipMatch.scoreB === null) {
                return null;
              }
              
              const teamAWon = championshipMatch.scoreA > championshipMatch.scoreB;
              const winningTeam = teamAWon ? championshipMatch.teamA : championshipMatch.teamB;
              const runnerUpTeam = teamAWon ? championshipMatch.teamB : championshipMatch.teamA;
              const winningScore = teamAWon ? championshipMatch.scoreA : championshipMatch.scoreB;
              const losingScore = teamAWon ? championshipMatch.scoreB : championshipMatch.scoreA;
              
              const getPlayerStats = (pid: string) => leaderboard.find(e => e.playerId === pid);
              const getPlayerName = (pid: string) => tournament.players.find(p => p.id === pid)?.name || 'Unknown';
              
              const allFinalists = [...winningTeam, ...runnerUpTeam]
                .map(pid => ({ id: pid, name: getPlayerName(pid), stats: getPlayerStats(pid) }))
                .sort((a, b) => (b.stats?.totalPoints || 0) - (a.stats?.totalPoints || 0));
              
              const placeLabels = ['🥇', '🥈', '🥉', '4th'];
              
              return (
                <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-300">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 justify-center mb-4">
                    <Trophy className="w-6 h-6 text-yellow-500" /> Championship Results
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl p-4 text-white text-center">
                      <div className="text-2xl mb-1">🏆</div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Champions</div>
                      <div className="font-black text-lg italic">{getPlayerName(winningTeam[0])} & {getPlayerName(winningTeam[1])}</div>
                      <div className="text-xl font-black mt-1">{winningScore}</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl p-4 text-slate-700 text-center">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Runner Up</div>
                      <div className="font-black text-lg italic">{getPlayerName(runnerUpTeam[0])} & {getPlayerName(runnerUpTeam[1])}</div>
                      <div className="text-xl font-black mt-1">{losingScore}</div>
                    </div>
                  </div>
                  
                  <div className="border-t-2 border-yellow-300 pt-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center mb-3">Individual Rankings</div>
                    <div className="grid grid-cols-4 gap-2">
                      {allFinalists.map((entry, idx) => (
                        <div key={entry.id} className="bg-white/60 rounded-lg p-2 text-center">
                          <div className="text-lg">{placeLabels[idx]}</div>
                          <div className="font-black text-sm italic truncate">{entry.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold">{entry.stats?.totalPoints || 0} pts</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Leaderboard Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" /> Standings
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3 text-center">W-L-T</th>
                      <th className="px-4 py-3 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((entry, idx) => (
                      <tr key={entry.playerId} className="hover:bg-indigo-50/10">
                        <td className="px-4 py-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                            idx === 0 ? 'bg-yellow-400 text-white' : 
                            idx === 1 ? 'bg-slate-200 text-slate-600' : 
                            idx === 2 ? 'bg-orange-300 text-white' : 'text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <PlayerName name={entry.playerName} baseClass="font-black text-slate-900 text-base italic uppercase block" />
                          <div className="text-[9px] text-slate-400 font-bold">Avg {entry.avgPoints}</div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 font-black text-xs">
                            <span className="text-emerald-500">{entry.wins}</span>
                            <span className="text-slate-200">-</span>
                            <span className="text-rose-400">{entry.losses}</span>
                            <span className="text-slate-200">-</span>
                            <span className="text-slate-400">{entry.ties}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-black text-2xl text-slate-900 italic">{entry.totalPoints}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        Live updates every 5s
      </div>
    </div>
  );
};

export default GameViewer;
