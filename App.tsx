import React, { useState, useEffect, useMemo } from 'react';
import { Player, Tournament, Round, LeaderboardEntry, Match } from './types.ts';
import { generateAmericanoSchedule, generateAdditionalRound, generateChampionshipRound } from './utils/scheduler.ts';
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
  const [courtNames, setCourtNames] = useState<string[]>([]);

  // Calculate number of courts based on player count
  const numCourts = Math.floor(players.length / 4);

  // Initialize court names when player count changes
  useEffect(() => {
    setCourtNames(prev => {
      if (numCourts === 0) return [];
      if (prev.length === numCourts) return prev;
      
      const newNames = [...prev];
      // Add default names for new courts
      while (newNames.length < numCourts) {
        newNames.push(`Court ${newNames.length + 1}`);
      }
      // Remove extra courts
      return newNames.slice(0, numCourts);
    });
  }, [numCourts]);

  useEffect(() => {
    const savedPlayers = localStorage.getItem('padel_players');
    const savedTournament = localStorage.getItem('padel_tournament');
    const savedCourtNames = localStorage.getItem('padel_court_names');
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    if (savedCourtNames) setCourtNames(JSON.parse(savedCourtNames));
    if (savedTournament) {
      try {
        const parsed = JSON.parse(savedTournament);
        setTournament(parsed);
        // Restore court names from tournament if available
        if (parsed.courtNames) setCourtNames(parsed.courtNames);
        setActiveTab('rounds');
      } catch (e) {
        console.error("Failed to load tournament", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('padel_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (tournament) localStorage.setItem('padel_tournament', JSON.stringify(tournament));
  }, [tournament]);

  useEffect(() => {
    if (courtNames.length > 0) {
      localStorage.setItem('padel_court_names', JSON.stringify(courtNames));
    }
  }, [courtNames]);

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
      courtNames: [...courtNames],
    });
    setCurrentRoundIndex(0);
    setActiveTab('rounds');
  };

  const updateCourtName = (index: number, name: string) => {
    setCourtNames(prev => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  // Get court name from tournament or state
  const getCourtName = (courtIndex: number): string => {
    if (tournament?.courtNames?.[courtIndex]) {
      return tournament.courtNames[courtIndex];
    }
    return `Court ${courtIndex + 1}`;
  };

  const resetTournament = () => {
    if (window.confirm("End tournament? Scores will be lost.")) {
      setTournament(null);
      localStorage.removeItem('padel_tournament');
      setActiveTab('setup');
    }
  };

  const clearAllData = () => {
    if (window.confirm("Clear ALL data? This will remove all players and tournament data.")) {
      setTournament(null);
      setPlayers([]);
      setCourtNames([]);
      localStorage.removeItem('padel_tournament');
      localStorage.removeItem('padel_players');
      localStorage.removeItem('padel_court_names');
      setActiveTab('setup');
    }
  };

  const addRound = () => {
    if (!tournament) return;
    const newRoundIndex = tournament.rounds.length;
    const newRound = generateAdditionalRound(
      tournament.players,
      tournament.rounds,
      newRoundIndex
    );
    setTournament({
      ...tournament,
      rounds: [...tournament.rounds, newRound]
    });
    setCurrentRoundIndex(newRoundIndex);
  };

  const addChampionshipRound = () => {
    if (!tournament || leaderboard.length < 4) return;
    const newRoundIndex = tournament.rounds.length;
    const newRound = generateChampionshipRound(
      tournament.players,
      leaderboard,
      tournament.rounds,
      newRoundIndex
    );
    setTournament({
      ...tournament,
      rounds: [...tournament.rounds, newRound]
    });
    setCurrentRoundIndex(newRoundIndex);
    setActiveTab('rounds');
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
      playerId: p.id, playerName: p.name, totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0
    });

    tournament.rounds.forEach(r => r.matches.forEach(m => {
      if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
      const processTeam = (pIds: [string, string], s: number, os: number) => {
        pIds.forEach(id => {
          if (!stats[id]) return;
          stats[id].totalPoints += s;
          stats[id].pointDifferential += (s - os); // Track point differential
          stats[id].matchesPlayed++;
          if (s > os) stats[id].wins++;
          else if (s < os) stats[id].losses++;
          else stats[id].ties++;
        });
      };
      processTeam(m.teamA, m.scoreA, m.scoreB);
      processTeam(m.teamB, m.scoreB, m.scoreA);
    }));

    // Sort: 1. Total Points, 2. Match Wins, 3. Point Differential
    return Object.values(stats)
      .map(s => ({ ...s, avgPoints: s.matchesPlayed ? Number((s.totalPoints / s.matchesPlayed).toFixed(1)) : 0 }))
      .sort((a, b) => 
        b.totalPoints - a.totalPoints || 
        b.wins - a.wins || 
        b.pointDifferential - a.pointDifferential
      );
  }, [tournament]);

  const isPerfect = tournament && [8, 12, 16].includes(tournament.players.length);

  // Keyboard navigation for rounds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tournament || activeTab !== 'rounds') return;
      // Don't navigate if user is typing in an input
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key === 'ArrowLeft' && currentRoundIndex > 0) {
        setCurrentRoundIndex(i => i - 1);
      } else if (e.key === 'ArrowRight' && currentRoundIndex < tournament.rounds.length - 1) {
        setCurrentRoundIndex(i => i + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tournament, activeTab, currentRoundIndex]);

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24 md:pb-6 md:pl-24 font-inter antialiased">
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-24 bg-white/90 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-200 z-50 flex md:flex-col justify-around md:justify-center items-center py-2 md:py-4 md:space-y-12">
        {[
          { tab: 'setup', icon: Settings, label: 'Setup' },
          { tab: 'rounds', icon: Layout, label: 'Matches', disabled: !tournament },
          { tab: 'leaderboard', icon: Trophy, label: 'Scores', disabled: !tournament }
        ].map(item => (
          <button 
            key={item.tab}
            disabled={item.disabled}
            onClick={() => setActiveTab(item.tab as any)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-2xl transition-all ${activeTab === item.tab ? 'text-indigo-600 bg-indigo-50 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${item.disabled ? 'opacity-20' : 'active:scale-90'}`}
          >
            <item.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={activeTab === item.tab ? 2.5 : 2} />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 text-white p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-xl shadow-indigo-100">
                <Zap className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />
              </div>
              <h1 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tight italic">
                AMERICANO<span className="text-indigo-600">PADEL</span>
              </h1>
            </div>
            <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] pl-1">Professional Whist Logic</p>
          </div>
          {isPerfect && (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-[1.5rem] border border-emerald-100 shadow-sm self-center md:self-auto">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mb-1">Whist Tournament</span>
                <span className="text-xs md:text-sm font-bold leading-none">Perfect Balance Active</span>
              </div>
            </div>
          )}
        </header>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden">
              {/* Tournament in progress overlay */}
              {tournament && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 text-center max-w-md">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-800 mb-2">Tournament In Progress</h3>
                    <p className="text-slate-600 text-sm mb-4">Players are locked while a tournament is active. End the current tournament to modify the roster.</p>
                    <button onClick={resetTournament} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold transition-all">
                      End Tournament
                    </button>
                  </div>
                </div>
              )}
              <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-3"><Users className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" /> Players</h2>
              <div className="flex gap-2 md:gap-4 mb-8 md:mb-10">
                <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Player name..." disabled={!!tournament} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl px-4 md:px-8 py-4 md:py-5 focus:outline-none focus:border-indigo-600 font-bold text-base md:text-lg disabled:opacity-50" />
                <button onClick={addPlayer} disabled={!!tournament} className="bg-indigo-600 text-white px-6 md:px-8 rounded-2xl md:rounded-3xl shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
                {players.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 py-16 md:py-20 text-center border-4 border-dashed border-slate-100 rounded-2xl md:rounded-[3rem] text-slate-300 font-black italic">No players added yet.</div>
                ) : players.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between bg-white border-2 border-slate-50 rounded-2xl md:rounded-[2rem] px-5 md:px-8 py-4 md:py-6 hover:border-indigo-100 shadow-sm transition-all group">
                    <span className="flex items-center tracking-tight min-w-0">
                      <span className="text-slate-300 mr-2 md:mr-3 font-black text-lg md:text-xl shrink-0">{idx+1}</span>
                      <PlayerName name={p.name} baseClass="font-black text-slate-800 text-lg md:text-xl" />
                    </span>
                    {!tournament && (
                      <button onClick={() => removePlayer(p.id)} className="text-slate-200 group-hover:text-rose-500 shrink-0"><Trash2 className="w-5 h-5 md:w-6 md:h-6" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-3xl md:rounded-[3rem] p-6 md:p-10 text-white shadow-2xl space-y-6 md:space-y-8 flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest">Tournament Info</h3>
                <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Athletes</span><span className="text-3xl md:text-4xl font-black">{players.length}</span></div>
                <div className="flex justify-between items-center pb-6 md:pb-8 border-b border-slate-800"><span className="text-slate-400 font-bold">Rounds</span><span className="text-3xl md:text-4xl font-black">{players.length > 0 ? (players.length % 2 === 0 ? players.length - 1 : players.length) : 0}</span></div>
                
                {/* Court Names Configuration */}
                {numCourts > 0 && !tournament && (
                  <div className="pt-2">
                    <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-4">Court Names</h3>
                    <div className="space-y-2">
                      {courtNames.map((name, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-slate-600 text-xs font-bold w-5">{idx + 1}</span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => updateCourtName(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Move to next input or blur
                                if (idx < courtNames.length - 1) {
                                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                                  nextInput?.focus();
                                } else {
                                  e.currentTarget.blur();
                                }
                              }
                            }}
                            placeholder={`Court ${idx + 1}`}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Show court names read-only during tournament */}
                {tournament?.courtNames && tournament.courtNames.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-4">Courts</h3>
                    <div className="space-y-1 text-sm text-slate-400">
                      {tournament.courtNames.map((name, idx) => (
                        <div key={idx}>{name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {!tournament ? (
                  <button onClick={startTournament} disabled={players.length < 4} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Play className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" /> GENERATE</button>
                ) : (
                  <button onClick={() => setActiveTab('rounds')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Layout className="w-5 h-5 md:w-6 md:h-6" /> GO TO MATCHES</button>
                )}
                {tournament && <button onClick={resetTournament} className="w-full text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2"><Trash className="w-3 h-3" /> End Tournament</button>}
                {(players.length > 0 && !tournament) && (
                  <button onClick={clearAllData} className="w-full text-rose-400 hover:text-rose-300 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors">
                    <Trash2 className="w-3 h-3" /> Clear All Data
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rounds' && tournament && (
          <div className="space-y-6 md:space-y-10">
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-sm border border-slate-200 p-6 md:p-10 flex items-center justify-between">
              <button disabled={currentRoundIndex === 0} onClick={() => setCurrentRoundIndex(i => i - 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0"><ChevronLeft className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
              <div className="text-center">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400 block mb-1">Round</span>
                <div className="text-4xl md:text-7xl font-black text-slate-900 flex items-center justify-center gap-2">
                  {currentRoundIndex + 1}<span className="text-slate-300 text-base md:text-2xl font-bold">/ {tournament.rounds.length}</span>
                  <button 
                    onClick={addRound} 
                    className="ml-2 p-2 md:p-3 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-all"
                    title="Add another round"
                  >
                    <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                  </button>
                </div>
                {(() => {
                  const matches = tournament.rounds[currentRoundIndex]?.matches || [];
                  const completed = matches.filter(m => m.isCompleted).length;
                  const total = matches.length;
                  return (
                    <div className="mt-2 text-[10px] md:text-xs font-bold text-slate-400">
                      {completed === total ? (
                        <span className="text-emerald-500">✓ All matches complete</span>
                      ) : (
                        <span>{completed}/{total} matches complete</span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button disabled={currentRoundIndex === tournament.rounds.length - 1} onClick={() => setCurrentRoundIndex(i => i + 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-0"><ChevronRight className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
            </div>
            <div className="grid gap-4 md:gap-8">
              {(tournament.rounds[currentRoundIndex]?.matches || [])
                .slice() // Don't mutate original
                .sort((a, b) => a.courtIndex - b.courtIndex) // Always show courts in order
                .map((match) => {
                const getP = (id: string) => tournament.players.find(p => p.id === id)?.name || 'Unknown';
                const teamAWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB;
                const teamBWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA;
                const winnerTextClass = "text-emerald-600";
                const winnerInputClass = "!border-emerald-400 !bg-emerald-50 text-emerald-700";
                return (
                  <div key={match.id} className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50/50 px-6 md:px-12 py-3 md:py-5 border-b border-slate-100 flex justify-between items-center font-black text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest">
                      <span>{getCourtName(match.courtIndex)}</span>
                      {match.isCompleted && <span className="text-emerald-500 flex items-center gap-1"><ShieldCheck size={12}/> Done</span>}
                    </div>
                    <div className="p-6 md:p-14 flex flex-col md:grid md:grid-cols-7 items-center gap-6 md:gap-8">
                      <div className="w-full md:col-span-2 text-center md:text-right space-y-1 pr-1">
                        <PlayerName name={getP(match.teamA[0])} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic block ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                        <PlayerName name={getP(match.teamA[1])} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic block ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                      </div>
                      <div className="w-full md:col-span-3 flex items-center justify-center gap-4 md:gap-6">
                        <input type="number" value={match.scoreA ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'A', e.target.value)} className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] focus:border-indigo-600 focus:bg-white transition-all outline-none ${teamAWon ? winnerInputClass : ''}`} placeholder="0" />
                        <span className="text-slate-200 font-black italic text-sm md:text-xl shrink-0">VS</span>
                        <input type="number" value={match.scoreB ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'B', e.target.value)} className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] focus:border-indigo-600 focus:bg-white transition-all outline-none ${teamBWon ? winnerInputClass : ''}`} placeholder="0" />
                      </div>
                      <div className="w-full md:col-span-2 text-center md:text-left space-y-1 pl-1">
                        <PlayerName name={getP(match.teamB[0])} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic block ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
                        <PlayerName name={getP(match.teamB[1])} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic block ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {tournament.rounds[currentRoundIndex]?.byes.length > 0 && (
              <div className="bg-amber-50/50 rounded-3xl p-6 md:p-10 border border-amber-100">
                <h3 className="text-amber-700 font-black text-[10px] md:text-[12px] uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2"><Info className="w-4 h-4 md:w-5 md:h-5"/> Currently Resting</h3>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {tournament.rounds[currentRoundIndex].byes.map(id => (
                    <div key={id} className="bg-white px-4 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-amber-200">
                      <PlayerName name={tournament.players.find(p => p.id === id)?.name || ''} baseClass="font-black text-sm md:text-xl" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            {/* Championship Round Button */}
            {leaderboard.length >= 4 && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-3xl md:rounded-[3rem] p-6 md:p-8 border border-yellow-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" /> Championship Round
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    1st + 3rd place vs 2nd + 4th place
                  </p>
                </div>
                <button 
                  onClick={addChampionshipRound}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" /> Create Finals
                </button>
              </div>
            )}
            
            <div className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 md:px-12 py-6 md:py-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3"><Award className="w-6 h-6 md:w-7 md:h-7 text-yellow-500" /> Standings</h2>
                <span className="hidden md:inline text-slate-400 text-xs font-black uppercase tracking-widest italic text-right">Sorted by Pts → Wins → Diff</span>
              </div>
              <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/30 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-4 md:px-12 py-4 md:py-8">Rank</th>
                      <th className="px-4 md:px-12 py-4 md:py-8">Athlete</th>
                      <th className="px-4 md:px-12 py-4 md:py-8 text-center">Record (W-L-T)</th>
                      <th className="px-4 md:px-12 py-4 md:py-8 text-right text-indigo-600">Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((entry, idx) => (
                      <tr key={entry.playerId} className="hover:bg-indigo-50/10 transition-colors">
                        <td className="px-4 md:px-12 py-6 md:py-10">
                          <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-xl ${idx === 0 ? 'bg-yellow-400 text-white shadow-lg' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-300 text-white' : 'text-slate-400'}`}>
                            {idx+1}
                          </div>
                        </td>
                        <td className="px-4 md:px-12 py-6 md:py-10">
                          <PlayerName name={entry.playerName} baseClass="font-black text-slate-900 text-lg md:text-2xl italic uppercase block" />
                          <div className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">Avg {entry.avgPoints} / Match</div>
                        </td>
                        <td className="px-4 md:px-12 py-6 md:py-10 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1 font-black text-xs md:text-base">
                            <span className="text-emerald-500">{entry.wins}W</span>
                            <span className="text-slate-200">-</span>
                            <span className="text-rose-400">{entry.losses}L</span>
                            <span className="text-slate-200">-</span>
                            <span className="text-slate-400">{entry.ties}T</span>
                          </div>
                        </td>
                        <td className="px-4 md:px-12 py-6 md:py-10 text-right">
                          <span className="font-black text-3xl md:text-6xl tracking-tighter text-slate-900 italic leading-none">{entry.totalPoints}</span>
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
    </div>
  );
};

export default App;