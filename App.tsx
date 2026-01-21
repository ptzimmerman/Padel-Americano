
import React, { useState, useEffect, useMemo } from 'react';
import { Player, Tournament, Round, LeaderboardEntry, Match } from './types';
import { generateAmericanoSchedule } from './utils/scheduler';
import { 
  Users, 
  Trophy, 
  Layout, 
  Settings, 
  Plus, 
  Trash2, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  Trash,
  Info,
  Award,
  ShieldCheck,
  Zap
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'setup' | 'rounds' | 'leaderboard'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  useEffect(() => {
    const savedPlayers = localStorage.getItem('padel_players');
    const savedTournament = localStorage.getItem('padel_tournament');
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    if (savedTournament) {
      setTournament(JSON.parse(savedTournament));
      setActiveTab('rounds');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('padel_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (tournament) localStorage.setItem('padel_tournament', JSON.stringify(tournament));
  }, [tournament]);

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    setPlayers([...players, { id: crypto.randomUUID(), name: newPlayerName.trim() }]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => setPlayers(players.filter(p => p.id !== id));

  const startTournament = () => {
    if (players.length < 4) return alert("You need at least 4 players.");
    const rounds = generateAmericanoSchedule(players);
    setTournament({
      id: crypto.randomUUID(),
      name: `Americano - ${new Date().toLocaleDateString()}`,
      players: [...players],
      rounds,
      isStarted: true,
    });
    setCurrentRoundIndex(0);
    setActiveTab('rounds');
  };

  const resetTournament = () => {
    if (window.confirm("End tournament? Scores will be lost.")) {
      setTournament(null);
      localStorage.removeItem('padel_tournament');
      setActiveTab('setup');
    }
  };

  const updateScore = (roundIdx: number, matchId: string, team: 'A' | 'B', score: string) => {
    if (!tournament) return;
    const val = score === '' ? null : Math.max(0, parseInt(score) || 0);
    const newRounds = tournament.rounds.map((r, ri) => ri === roundIdx ? {
      ...r, matches: r.matches.map(m => m.id === matchId ? {
        ...m, 
        [team === 'A' ? 'scoreA' : 'scoreB']: val, 
        isCompleted: (team === 'A' ? val : m.scoreA) !== null && (team === 'B' ? val : m.scoreB) !== null
      } : m)
    } : r);
    setTournament({ ...tournament, rounds: newRounds });
  };

  // Easter egg helper for name rendering
  const PlayerName = ({ name, baseClass }: { name: string, baseClass: string }) => {
    const isPete = name.trim().toLowerCase() === 'pete';
    return (
      <span className={`${baseClass} ${isPete ? 'scale-50 origin-left inline-block' : ''}`}>
        {name}
      </span>
    );
  };

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!tournament) return [];
    const stats: Record<string, LeaderboardEntry> = {};
    tournament.players.forEach(p => stats[p.id] = {
      playerId: p.id, playerName: p.name, totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0
    });

    tournament.rounds.forEach(r => r.matches.forEach(m => {
      if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
      const processTeam = (pIds: [string, string], s: number, os: number) => {
        pIds.forEach(id => {
          if (!stats[id]) return;
          stats[id].totalPoints += s;
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
      .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || a.matchesPlayed - b.matchesPlayed);
  }, [tournament]);

  const isPerfect = tournament && [8, 12, 16].includes(tournament.players.length);

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24 md:pb-0 md:pl-24 font-inter">
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-24 bg-white border-t md:border-t-0 md:border-r border-slate-200 z-50 flex md:flex-col justify-around md:justify-center items-center py-4 md:space-y-12">
        {[
          { tab: 'setup', icon: Settings, label: 'Setup' },
          { tab: 'rounds', icon: Layout, label: 'Matches', disabled: !tournament },
          { tab: 'leaderboard', icon: Trophy, label: 'Scores', disabled: !tournament }
        ].map(item => (
          <button 
            key={item.tab}
            disabled={item.disabled}
            onClick={() => setActiveTab(item.tab as any)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${activeTab === item.tab ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${item.disabled ? 'opacity-20' : 'active:scale-90'}`}
          >
            <item.icon size={28} strokeWidth={activeTab === item.tab ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-xl shadow-indigo-100">
                <Zap size={28} fill="currentColor" />
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight italic">
                AMERICANO<span className="text-indigo-600">PADEL</span>
              </h1>
            </div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Professional Whist Logic</p>
          </div>
          {isPerfect && (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-[1.5rem] border border-emerald-100 shadow-sm">
              <ShieldCheck size={20} className="text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Whist Tournament</span>
                <span className="text-sm font-bold leading-none">Perfect Balance Active</span>
              </div>
            </div>
          )}
        </header>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-sm border border-slate-200 p-10 relative overflow-hidden">
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><Users size={24} className="text-indigo-600" /> Players</h2>
              <div className="flex gap-4 mb-10">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Player name..." className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 focus:outline-none focus:border-indigo-600 font-bold text-lg" />
                <button onClick={addPlayer} className="bg-indigo-600 text-white px-8 rounded-3xl shadow-lg transition-all active:scale-95"><Plus size={32} strokeWidth={3} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {players.length === 0 ? (
                  <div className="col-span-2 py-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-black italic">No players added yet.</div>
                ) : players.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between bg-white border-2 border-slate-50 rounded-[2rem] px-8 py-6 hover:border-indigo-100 shadow-sm transition-all">
                    <span className="flex items-center tracking-tight">
                      <span className="text-slate-300 mr-3 font-black text-xl">{idx+1}</span>
                      <PlayerName name={p.name} baseClass="font-black text-slate-800 text-xl" />
                    </span>
                    <button onClick={() => removePlayer(p.id)} className="text-slate-200 hover:text-rose-500"><Trash2 size={24} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8">
              <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Configuration</h3>
              <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Total Players</span><span className="text-4xl font-black">{players.length}</span></div>
              <div className="flex justify-between items-center pb-8 border-b border-slate-800"><span className="text-slate-400 font-bold">Total Rounds</span><span className="text-4xl font-black">{players.length > 0 ? (players.length % 2 === 0 ? players.length - 1 : players.length) : 0}</span></div>
              <button onClick={startTournament} disabled={players.length < 4} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Play size={24} fill="currentColor" /> START</button>
              {tournament && <button onClick={resetTournament} className="w-full text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Trash size={14} /> End Current Session</button>}
            </div>
          </div>
        )}

        {activeTab === 'rounds' && tournament && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[4rem] shadow-sm border border-slate-200 p-10 flex items-center justify-between">
              <button disabled={currentRoundIndex === 0} onClick={() => setCurrentRoundIndex(i => i - 1)} className="p-6 rounded-[2rem] text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><ChevronLeft size={48} strokeWidth={3} /></button>
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 block mb-2">Round</span>
                <div className="text-7xl font-black text-slate-900">{currentRoundIndex + 1}<span className="text-slate-300 text-2xl font-bold ml-2">/ {tournament.rounds.length}</span></div>
              </div>
              <button disabled={currentRoundIndex === tournament.rounds.length - 1} onClick={() => setCurrentRoundIndex(i => i + 1)} className="p-6 rounded-[2rem] text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><ChevronRight size={48} strokeWidth={3} /></button>
            </div>
            <div className="grid gap-8">
              {(tournament.rounds[currentRoundIndex]?.matches || []).map((match) => {
                const getP = (id: string) => tournament.players.find(p => p.id === id)?.name || 'Unknown';
                return (
                  <div key={match.id} className="bg-white rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden group">
                    <div className="bg-slate-50/50 px-12 py-5 border-b border-slate-100 flex justify-between items-center font-black text-[10px] text-slate-400 uppercase tracking-widest">
                      <span>Court {match.courtIndex + 1}</span>
                      {match.isCompleted && <span className="text-emerald-500 flex items-center gap-2"><ShieldCheck size={14}/> Completed</span>}
                    </div>
                    <div className="p-14 grid grid-cols-1 lg:grid-cols-7 items-center gap-8">
                      <div className="lg:col-span-2 text-center lg:text-right space-y-1">
                        <PlayerName name={getP(match.teamA[0])} baseClass="text-3xl font-[900] text-slate-900 tracking-tight italic block" />
                        <PlayerName name={getP(match.teamA[1])} baseClass="text-3xl font-[900] text-slate-900 tracking-tight italic block" />
                      </div>
                      <div className="lg:col-span-3 flex items-center justify-center gap-6">
                        <input type="number" value={match.scoreA ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'A', e.target.value)} className="w-28 h-28 text-center text-5xl font-black bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] focus:border-indigo-600 transition-all" />
                        <span className="text-slate-200 font-black italic text-xl">VS</span>
                        <input type="number" value={match.scoreB ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'B', e.target.value)} className="w-28 h-28 text-center text-5xl font-black bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] focus:border-indigo-600 transition-all" />
                      </div>
                      <div className="lg:col-span-2 text-center lg:text-left space-y-1">
                        <PlayerName name={getP(match.teamB[0])} baseClass="text-3xl font-[900] text-slate-900 tracking-tight italic block" />
                        <PlayerName name={getP(match.teamB[1])} baseClass="text-3xl font-[900] text-slate-900 tracking-tight italic block" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {tournament.rounds[currentRoundIndex]?.byes.length > 0 && (
              <div className="bg-amber-50/50 rounded-[3rem] p-10 border border-amber-100">
                <h3 className="text-amber-700 font-black text-[12px] uppercase tracking-widest mb-6 flex items-center gap-2"><Info size={20}/> Currently Resting</h3>
                <div className="flex flex-wrap gap-3">
                  {tournament.rounds[currentRoundIndex].byes.map(id => (
                    <div key={id} className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-amber-200 min-w-[120px]">
                      <PlayerName name={tournament.players.find(p => p.id === id)?.name || ''} baseClass="font-black text-xl" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Award size={28} className="text-yellow-500" /> Standings</h2>
                <span className="text-slate-400 text-xs font-black uppercase tracking-widest italic">Ranked by Total Points</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-12 py-8">Rank</th><th className="px-12 py-8">Athlete</th><th className="px-12 py-8 text-center">Record</th><th className="px-12 py-8 text-right text-indigo-600">Total Pts</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 font-inter">
                    {leaderboard.map((entry, idx) => (
                      <tr key={entry.playerId} className="hover:bg-indigo-50/10 transition-colors">
                        <td className="px-12 py-10"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${idx === 0 ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-300 text-white' : 'text-slate-400'}`}>{idx+1}</div></td>
                        <td className="px-12 py-10">
                          <PlayerName name={entry.playerName} baseClass="font-black text-slate-900 text-2xl italic uppercase block" />
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Avg {entry.avgPoints} / Game</div>
                        </td>
                        <td className="px-12 py-10 text-center text-sm font-black italic"><span className="text-emerald-500">{entry.wins}W</span> — <span className="text-rose-400">{entry.losses}L</span></td>
                        <td className="px-12 py-10 text-right font-black text-5xl tracking-tighter text-slate-900 italic">{entry.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
