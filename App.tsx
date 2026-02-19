import React, { useState, useEffect, useMemo } from 'react';
import { Player, Tournament, Round, LeaderboardEntry, Match } from './types.ts';
import { generateAmericanoSchedule, generateAdditionalRound, generateChampionshipRound, generateEventRound } from './utils/scheduler.ts';
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
  Zap,
  Share2,
  Copy,
  Check,
  Loader2,
  Link as LinkIcon,
  X,
  Sparkles,
  Filter,
  UserPlus,
  UserMinus,
  Monitor,
  Tablet
} from 'lucide-react';

interface ShareState {
  isSharing: boolean;
  shareId: string | null;
  pin: string | null;
  shareUrl: string | null;
  isSyncing: boolean;
  lastSynced: Date | null;
}

const SKILL_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'setup' | 'rounds' | 'leaderboard'>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState<'low' | 'medium' | 'high'>('medium');
  const [newPlayerTotogian, setNewPlayerTotogian] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [courtNames, setCourtNames] = useState<string[]>([]);
  
  // Event mode
  const [eventMode, setEventMode] = useState(false);
  const [eventNumCourts, setEventNumCourts] = useState(4);
  
  // Leaderboard filter
  const [hideTotogians, setHideTotogians] = useState(false);
  
  // Sharing state
  const [shareState, setShareState] = useState<ShareState>({
    isSharing: false,
    shareId: null,
    pin: null,
    shareUrl: null,
    isSyncing: false,
    lastSynced: null,
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKioskUrl, setCopiedKioskUrl] = useState(false);
  const [copiedDisplayUrl, setCopiedDisplayUrl] = useState(false);
  
  // Nickname generation
  const [generateNicknames, setGenerateNicknames] = useState(false);
  const [isGeneratingNicknames, setIsGeneratingNicknames] = useState(false);

  const isEvent = eventMode || tournament?.mode === 'event';
  const themeColor = isEvent ? 'purple' : 'indigo';
  
  // Theme classes
  const tc = {
    primary: isEvent ? 'bg-purple-600' : 'bg-indigo-600',
    primaryHover: isEvent ? 'hover:bg-purple-700' : 'hover:bg-indigo-700',
    primaryText: isEvent ? 'text-purple-600' : 'text-indigo-600',
    primaryLight: isEvent ? 'bg-purple-50' : 'bg-indigo-50',
    primaryBorder: isEvent ? 'border-purple-200' : 'border-indigo-200',
    activeTab: isEvent ? 'text-purple-600 bg-purple-50' : 'text-indigo-600 bg-indigo-50',
    focusBorder: isEvent ? 'focus:border-purple-600' : 'focus:border-indigo-600',
    shadow: isEvent ? 'shadow-purple-100' : 'shadow-indigo-100',
    nicknameText: isEvent ? 'text-purple-400' : 'text-indigo-400',
  };

  // Calculate number of courts based on mode
  const numCourts = isEvent ? eventNumCourts : Math.floor(players.length / 4);

  // Initialize court names when court count changes
  useEffect(() => {
    setCourtNames(prev => {
      if (numCourts === 0) return [];
      if (prev.length === numCourts) return prev;
      
      const newNames = [...prev];
      while (newNames.length < numCourts) {
        newNames.push(`Court ${newNames.length + 1}`);
      }
      return newNames.slice(0, numCourts);
    });
  }, [numCourts]);

  useEffect(() => {
    const savedPlayers = localStorage.getItem('padel_players');
    const savedTournament = localStorage.getItem('padel_tournament');
    const savedCourtNames = localStorage.getItem('padel_court_names');
    const savedEventMode = localStorage.getItem('padel_event_mode');
    const savedEventCourts = localStorage.getItem('padel_event_courts');
    if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    if (savedCourtNames) setCourtNames(JSON.parse(savedCourtNames));
    if (savedEventMode === 'true') setEventMode(true);
    if (savedEventCourts) setEventNumCourts(parseInt(savedEventCourts) || 4);
    if (savedTournament) {
      try {
        const parsed = JSON.parse(savedTournament);
        setTournament(parsed);
        if (parsed.courtNames) setCourtNames(parsed.courtNames);
        if (parsed.mode === 'event') setEventMode(true);
        if (parsed.numCourts) setEventNumCourts(parsed.numCourts);
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

  useEffect(() => {
    localStorage.setItem('padel_event_mode', eventMode.toString());
  }, [eventMode]);

  useEffect(() => {
    localStorage.setItem('padel_event_courts', eventNumCourts.toString());
  }, [eventNumCourts]);

  // Load share state from localStorage
  useEffect(() => {
    const savedShare = localStorage.getItem('padel_share_state');
    if (savedShare) {
      try {
        const parsed = JSON.parse(savedShare);
        setShareState(prev => ({
          ...prev,
          isSharing: parsed.isSharing,
          shareId: parsed.shareId,
          pin: parsed.pin,
          shareUrl: parsed.shareUrl,
        }));
      } catch (e) {
        console.error("Failed to load share state", e);
      }
    }
  }, []);

  // Save share state to localStorage
  useEffect(() => {
    if (shareState.isSharing) {
      localStorage.setItem('padel_share_state', JSON.stringify({
        isSharing: shareState.isSharing,
        shareId: shareState.shareId,
        pin: shareState.pin,
        shareUrl: shareState.shareUrl,
      }));
    } else {
      localStorage.removeItem('padel_share_state');
    }
  }, [shareState.isSharing, shareState.shareId, shareState.pin, shareState.shareUrl]);

  // Sync tournament to cloud when it changes (if sharing is active)
  useEffect(() => {
    if (!shareState.isSharing || !shareState.shareId || !shareState.pin || !tournament) return;
    
    const syncToCloud = async () => {
      setShareState(prev => ({ ...prev, isSyncing: true }));
      try {
        const response = await fetch(`/api/game/${shareState.shareId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Tournament-Pin': shareState.pin,
          },
          body: JSON.stringify({ tournament }),
        });
        
        if (response.ok) {
          setShareState(prev => ({ ...prev, lastSynced: new Date() }));
        } else {
          console.error('Failed to sync:', await response.text());
        }
      } catch (error) {
        console.error('Sync error:', error);
      } finally {
        setShareState(prev => ({ ...prev, isSyncing: false }));
      }
    };

    const timer = setTimeout(syncToCloud, 500);
    return () => clearTimeout(timer);
  }, [tournament, shareState.isSharing, shareState.shareId, shareState.pin]);

  const startSharing = async () => {
    if (!tournament) return;
    
    setShareState(prev => ({ ...prev, isSyncing: true }));
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create shared game');
      }
      
      const data = await response.json();
      const fullUrl = `${window.location.origin}/game/${data.id}`;
      
      setShareState({
        isSharing: true,
        shareId: data.id,
        pin: data.pin,
        shareUrl: fullUrl,
        isSyncing: false,
        lastSynced: new Date(),
      });
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to start sharing:', error);
      alert('Failed to create shared game. Please try again.');
      setShareState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const stopSharing = async () => {
    if (!shareState.shareId || !shareState.pin) return;
    
    if (!window.confirm('Stop sharing this tournament? Others will no longer be able to view it.')) return;
    
    try {
      await fetch(`/api/game/${shareState.shareId}`, {
        method: 'DELETE',
        headers: { 'X-Tournament-Pin': shareState.pin },
      });
    } catch (error) {
      console.error('Failed to delete shared game:', error);
    }
    
    setShareState({
      isSharing: false,
      shareId: null,
      pin: null,
      shareUrl: null,
      isSyncing: false,
      lastSynced: null,
    });
  };

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      ...(isEvent && {
        skillLevel: newPlayerSkill,
        isTotogian: newPlayerTotogian,
        isActive: true,
      }),
    };
    setPlayers(prev => [...prev, newPlayer]);
    
    // If tournament is running in event mode, add player to tournament too
    if (tournament && tournament.mode === 'event') {
      setTournament(prev => prev ? {
        ...prev,
        players: [...prev.players, newPlayer],
      } : prev);
    }
    
    setNewPlayerName('');
    setNewPlayerTotogian(false);
  };

  const removePlayer = (id: string) => {
    if (tournament?.mode === 'event') {
      // In event mode, just deactivate instead of removing
      togglePlayerActive(id);
      return;
    }
    setPlayers(players.filter(p => p.id !== id));
  };

  const togglePlayerActive = (id: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
    if (tournament?.mode === 'event') {
      setTournament(prev => prev ? {
        ...prev,
        players: prev.players.map(p =>
          p.id === id ? { ...p, isActive: !p.isActive } : p
        ),
      } : prev);
    }
  };

  const startTournament = async () => {
    if (players.length < 4) return alert("You need at least 4 players.");
    
    let tournamentPlayers = [...players];
    
    // In event mode, mark all players as active
    if (eventMode) {
      tournamentPlayers = tournamentPlayers.map(p => ({ ...p, isActive: true }));
      setPlayers(tournamentPlayers);
    }
    
    // Generate nicknames if checkbox is checked
    if (generateNicknames) {
      setIsGeneratingNicknames(true);
      try {
        const response = await fetch('/api/nicknames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: players.map(p => p.name) }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.nicknames) {
            tournamentPlayers = tournamentPlayers.map(p => ({
              ...p,
              nickname: data.nicknames[p.name] || undefined,
            }));
            setPlayers(tournamentPlayers);
          }
        } else {
          const errorText = await response.text();
          console.error('Failed to generate nicknames:', response.status, errorText);
          alert('Failed to generate nicknames. Proceeding without them.');
        }
      } catch (error) {
        console.error('Error generating nicknames:', error);
        alert('Error connecting to nickname service. Proceeding without nicknames.');
      } finally {
        setIsGeneratingNicknames(false);
      }
    }
    
    if (eventMode) {
      // Event mode: start with no rounds, generate on demand
      setTournament({
        id: crypto.randomUUID(),
        name: `Totogi Padel Invitational - ${new Date().toLocaleDateString()}`,
        players: tournamentPlayers,
        rounds: [],
        isStarted: true,
        courtNames: [...courtNames],
        mode: 'event',
        numCourts: eventNumCourts,
      });
    } else {
      const rounds = generateAmericanoSchedule(tournamentPlayers);
      setTournament({
        id: crypto.randomUUID(),
        name: `Americano - ${new Date().toLocaleDateString()}`,
        players: tournamentPlayers,
        rounds,
        isStarted: true,
        courtNames: [...courtNames],
        mode: 'classic',
      });
    }
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

  const getCourtName = (courtIndex: number): string => {
    if (tournament?.courtNames?.[courtIndex]) {
      return tournament.courtNames[courtIndex];
    }
    return `Court ${courtIndex + 1}`;
  };

  const resetTournament = async () => {
    if (window.confirm("End tournament? Scores will be lost.")) {
      if (shareState.isSharing && shareState.shareId && shareState.pin) {
        try {
          await fetch(`/api/game/${shareState.shareId}`, {
            method: 'DELETE',
            headers: { 'X-Tournament-Pin': shareState.pin },
          });
        } catch (e) {
          console.error('Failed to delete shared game:', e);
        }
        setShareState({
          isSharing: false,
          shareId: null,
          pin: null,
          shareUrl: null,
          isSyncing: false,
          lastSynced: null,
        });
      }
      setTournament(null);
      localStorage.removeItem('padel_tournament');
      setActiveTab('setup');
    }
  };

  const clearAllData = async () => {
    if (window.confirm("Clear ALL data? This will remove all players and tournament data.")) {
      if (shareState.isSharing && shareState.shareId && shareState.pin) {
        try {
          await fetch(`/api/game/${shareState.shareId}`, {
            method: 'DELETE',
            headers: { 'X-Tournament-Pin': shareState.pin },
          });
        } catch (e) {
          console.error('Failed to delete shared game:', e);
        }
        setShareState({
          isSharing: false,
          shareId: null,
          pin: null,
          shareUrl: null,
          isSyncing: false,
          lastSynced: null,
        });
      }
      setTournament(null);
      setPlayers([]);
      setCourtNames([]);
      setEventMode(false);
      localStorage.removeItem('padel_tournament');
      localStorage.removeItem('padel_players');
      localStorage.removeItem('padel_court_names');
      localStorage.removeItem('padel_share_state');
      localStorage.removeItem('padel_event_mode');
      localStorage.removeItem('padel_event_courts');
      setActiveTab('setup');
    }
  };

  const addRound = () => {
    if (!tournament) return;
    const newRoundIndex = tournament.rounds.length;
    
    if (tournament.mode === 'event') {
      const activePlayers = tournament.players.filter(p => p.isActive !== false);
      if (activePlayers.length < 4) {
        return alert("Need at least 4 active players to generate a round.");
      }
      const nc = tournament.numCourts || Math.floor(activePlayers.length / 4);
      const newRound = generateEventRound(
        activePlayers,
        tournament.players,
        tournament.rounds,
        newRoundIndex,
        nc
      );
      setTournament({
        ...tournament,
        rounds: [...tournament.rounds, newRound],
        courtNames: [...courtNames],
      });
    } else {
      const newRound = generateAdditionalRound(
        tournament.players,
        tournament.rounds,
        newRoundIndex
      );
      setTournament({
        ...tournament,
        rounds: [...tournament.rounds, newRound]
      });
    }
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

  const PlayerName = ({ name, nickname, baseClass, inline = false }: { name: string, nickname?: string, baseClass: string, inline?: boolean }) => {
    if (inline) {
      return (
        <span className={baseClass}>
          {name}
          {nickname && (
            <span className={`${tc.nicknameText} font-semibold not-italic text-[0.65em] ml-2`}>"{nickname}"</span>
          )}
        </span>
      );
    }
    return (
      <div className={baseClass}>
        <div>{name}</div>
        {nickname && (
          <div className={`${tc.nicknameText} font-medium not-italic text-xs md:text-sm tracking-wide mt-0.5`}>"{nickname}"</div>
        )}
      </div>
    );
  };

  const getPlayer = (id: string) => tournament?.players.find(p => p.id === id);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!tournament) return [];
    const stats: Record<string, LeaderboardEntry> = {};
    tournament.players.forEach(p => stats[p.id] = {
      playerId: p.id, playerName: p.name, playerNickname: p.nickname, isTotogian: p.isTotogian, totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0
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

  // Filtered leaderboard for prize display (non-Totogian)
  const prizeLeaderboard = useMemo(() => 
    leaderboard.filter(e => !e.isTotogian),
  [leaderboard]);
  
  const displayLeaderboard = hideTotogians ? prizeLeaderboard : leaderboard;

  // Prize rank (skipping Totogians)
  const getPrizeRank = (playerId: string): number | null => {
    if (!isEvent) return null;
    const idx = prizeLeaderboard.findIndex(e => e.playerId === playerId);
    return idx >= 0 ? idx : null;
  };

  const isPerfect = tournament && tournament.mode !== 'event' && [8, 12, 16].includes(tournament.players.length);

  // Active players for event mode
  const activePlayers = players.filter(p => p.isActive !== false);
  const currentRoundComplete = tournament?.rounds[tournament.rounds.length - 1]?.matches.every(m => m.isCompleted) ?? true;

  // Keyboard navigation for rounds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tournament || activeTab !== 'rounds') return;
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
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-2xl transition-all ${activeTab === item.tab ? tc.activeTab + ' shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${item.disabled ? 'opacity-20' : 'active:scale-90'}`}
          >
            <item.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={activeTab === item.tab ? 2.5 : 2} />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            {isEvent ? (
              <div className="flex items-center gap-3 mb-2">
                <img src="/totogi-padel-logo.png" alt="Totogi Padel" className="w-12 h-12 md:w-14 md:h-14 rounded-xl" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tight italic">
                    PADEL<span className="text-purple-600"> INVITATIONAL</span>
                  </h1>
                  <p className="text-purple-500 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] pl-0.5 flex items-center gap-1.5">
                    <img src="/totogi-logo.png" alt="totogi" className="h-3 md:h-3.5 opacity-80" /> Social Mixer
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`${tc.primary} text-white p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-xl ${tc.shadow}`}>
                    <Zap className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tight italic">
                    AMERICANO<span className={tc.primaryText}>PADEL</span>
                  </h1>
                </div>
                <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] pl-1">Professional Whist Logic</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 self-center md:self-auto">
          {isPerfect && (
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-[1.5rem] border border-emerald-100 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mb-1">Whist Tournament</span>
                <span className="text-xs md:text-sm font-bold leading-none">Perfect Balance Active</span>
              </div>
            </div>
          )}
            {tournament && (
              <button
                onClick={() => shareState.isSharing ? setShowShareModal(true) : startSharing()}
                disabled={shareState.isSyncing}
                className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-3 rounded-2xl font-bold transition-all active:scale-95 ${
                  shareState.isSharing 
                    ? `${tc.primaryLight} ${tc.primaryText} border ${tc.primaryBorder}` 
                    : `${tc.primary} text-white shadow-lg`
                }`}
              >
                {shareState.isSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : shareState.isSharing ? (
                  <LinkIcon className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="text-sm">{shareState.isSharing ? 'Sharing' : 'Share'}</span>
              </button>
            )}
          </div>
        </header>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden">
              {/* Tournament in progress overlay - only for classic mode */}
              {tournament && tournament.mode !== 'event' && (
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

              {/* Event mode banner when tournament is running */}
              {tournament?.mode === 'event' && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-purple-700 font-bold text-sm">Event Mode Active — Add or toggle players between rounds</span>
                </div>
              )}

              <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-3"><Users className={`w-5 h-5 md:w-6 md:h-6 ${tc.primaryText}`} /> Players</h2>
              
              {/* Player input */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-2 md:gap-4">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder="Player name..." disabled={!!tournament && tournament.mode !== 'event'} className={`flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl px-4 md:px-8 py-4 md:py-5 focus:outline-none ${tc.focusBorder} font-bold text-base md:text-lg disabled:opacity-50`} />
                  <button onClick={addPlayer} disabled={!!tournament && tournament.mode !== 'event'} className={`${tc.primary} text-white px-6 md:px-8 rounded-2xl md:rounded-3xl shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}><Plus className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /></button>
                </div>
                
                {/* Skill level + Totogian selectors for event mode */}
                {isEvent && (
                  <div className="flex flex-wrap items-center gap-3 px-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Skill:</span>
                    {(['low', 'medium', 'high'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setNewPlayerSkill(level)}
                        className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                          newPlayerSkill === level
                            ? `${SKILL_COLORS[level].bg} ${SKILL_COLORS[level].text} border-2 ${SKILL_COLORS[level].border}`
                            : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:border-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${newPlayerTotogian ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                        {newPlayerTotogian && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <input type="checkbox" checked={newPlayerTotogian} onChange={(e) => setNewPlayerTotogian(e.target.checked)} className="sr-only" />
                      <span className="text-xs font-bold text-slate-500">Totogian</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Player list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
                {players.length === 0 ? (
                  <div className="col-span-1 md:col-span-2 py-16 md:py-20 text-center border-4 border-dashed border-slate-100 rounded-2xl md:rounded-[3rem] text-slate-300 font-black italic">No players added yet.</div>
                ) : players.map((p, idx) => (
                  <div key={p.id} className={`flex items-center justify-between bg-white border-2 rounded-2xl md:rounded-[2rem] px-5 md:px-8 py-4 md:py-5 shadow-sm transition-all group ${
                    tournament?.mode === 'event' && p.isActive === false
                      ? 'border-slate-100 opacity-50'
                      : 'border-slate-50 hover:border-slate-200'
                  }`}>
                    <span className="flex items-center tracking-tight min-w-0 gap-2">
                      <span className="text-slate-300 font-black text-lg md:text-xl shrink-0">{idx+1}</span>
                      <div className="min-w-0">
                        <PlayerName name={p.name} nickname={p.nickname} baseClass="font-black text-slate-800 text-lg md:text-xl" inline />
                        {isEvent && (
                          <div className="flex items-center gap-2 mt-1">
                            {p.skillLevel && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${SKILL_COLORS[p.skillLevel].bg} ${SKILL_COLORS[p.skillLevel].text}`}>
                                {p.skillLevel}
                              </span>
                            )}
                            {p.isTotogian && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-600">
                                Totogi
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {tournament?.mode === 'event' ? (
                        <button
                          onClick={() => togglePlayerActive(p.id)}
                          className={`p-2 rounded-xl transition-all ${
                            p.isActive !== false
                              ? 'text-emerald-500 hover:bg-emerald-50'
                              : 'text-slate-300 hover:bg-slate-50'
                          }`}
                          title={p.isActive !== false ? 'Active — click to sit out' : 'Sitting out — click to activate'}
                        >
                          {p.isActive !== false ? <UserPlus className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                        </button>
                      ) : !tournament ? (
                        <button onClick={() => removePlayer(p.id)} className="text-slate-200 group-hover:text-rose-500"><Trash2 className="w-5 h-5 md:w-6 md:h-6" /></button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className={`${isEvent ? 'bg-purple-950' : 'bg-slate-900'} rounded-3xl md:rounded-[3rem] p-6 md:p-10 text-white shadow-2xl space-y-6 md:space-y-8 flex flex-col justify-between`}>
              <div className="space-y-6">
                {/* Mode selector - only before tournament starts */}
                {!tournament && (
                  <div>
                    <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-3">Tournament Mode</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEventMode(false)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all text-center ${
                          !eventMode
                            ? 'bg-white/10 border-2 border-white/20 text-white'
                            : 'border-2 border-transparent text-slate-500 hover:border-white/10'
                        }`}
                      >
                        <Zap className="w-5 h-5 mx-auto mb-1" />
                        Classic
                      </button>
                      <button
                        onClick={() => setEventMode(true)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all text-center ${
                          eventMode
                            ? 'bg-purple-600/30 border-2 border-purple-400/40 text-purple-300'
                            : 'border-2 border-transparent text-slate-500 hover:border-white/10'
                        }`}
                      >
                        <Trophy className="w-5 h-5 mx-auto mb-1" />
                        Event
                      </button>
                    </div>
                  </div>
                )}
                
                <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest">Tournament Info</h3>
                <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">Athletes</span><span className="text-3xl md:text-4xl font-black">{players.length}</span></div>
                
                {isEvent ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Active</span>
                      <span className="text-3xl md:text-4xl font-black text-emerald-400">{activePlayers.length}</span>
                    </div>
                    <div className="flex justify-between items-center pb-6 md:pb-8 border-b border-slate-800">
                      <span className="text-slate-400 font-bold">Courts</span>
                      {!tournament ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={eventNumCourts}
                          onChange={(e) => setEventNumCourts(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-right text-3xl md:text-4xl font-black bg-transparent border-b-2 border-slate-700 focus:border-purple-500 outline-none"
                        />
                      ) : (
                        <span className="text-3xl md:text-4xl font-black">{tournament.numCourts || eventNumCourts}</span>
                      )}
                    </div>
                    {tournament && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold">Rounds</span>
                        <span className="text-3xl md:text-4xl font-black">{tournament.rounds.length}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between items-center pb-6 md:pb-8 border-b border-slate-800"><span className="text-slate-400 font-bold">Rounds</span><span className="text-3xl md:text-4xl font-black">{players.length > 0 ? (players.length % 2 === 0 ? players.length - 1 : players.length) : 0}</span></div>
                )}
                
                {/* Court Names Configuration */}
                {numCourts > 0 && (!tournament || tournament.mode === 'event') && (
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
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                if (idx < courtNames.length - 1) {
                                  e.preventDefault();
                                  const nextInput = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                                  nextInput?.focus();
                                }
                              }
                            }}
                            placeholder={`Court ${idx + 1}`}
                            className={`flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none ${isEvent ? 'focus:border-purple-500' : 'focus:border-indigo-500'} placeholder:text-slate-600`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tournament?.courtNames && tournament.courtNames.length > 0 && tournament.mode !== 'event' && (
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
                {!tournament && players.length >= 4 && (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${generateNicknames ? `${tc.primary} border-transparent` : 'border-slate-600 group-hover:border-slate-500'}`}>
                      {generateNicknames && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <input 
                      type="checkbox" 
                      checked={generateNicknames} 
                      onChange={(e) => setGenerateNicknames(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-slate-400 font-bold text-sm flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${isEvent ? 'text-purple-400' : 'text-indigo-400'}`} />
                      Generate AI Nicknames
                    </span>
                  </label>
                )}
                {!tournament ? (
                  <button onClick={startTournament} disabled={players.length < 4 || isGeneratingNicknames} className={`w-full ${tc.primary} ${tc.primaryHover} disabled:bg-slate-800 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all active:scale-95`}>
                    {isGeneratingNicknames ? (
                      <>
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                        GENERATING...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                        {eventMode ? 'START EVENT' : 'GENERATE'}
                      </>
                    )}
                  </button>
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
            {/* Event mode: Generate Next Round button */}
            {tournament.mode === 'event' && (tournament.rounds.length === 0 || currentRoundComplete) && (
              <div className={`bg-gradient-to-r ${isEvent ? 'from-purple-50 to-violet-50 border-purple-200' : 'from-indigo-50 to-blue-50 border-indigo-200'} rounded-3xl p-6 md:p-8 border flex flex-col md:flex-row items-center justify-between gap-4`}>
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                    <Zap className={`w-5 h-5 ${isEvent ? 'text-purple-500' : 'text-indigo-500'}`} />
                    {tournament.rounds.length === 0 ? 'Generate First Round' : 'Generate Next Round'}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {activePlayers.length} active players • {tournament.numCourts} courts • Skill-balanced matchmaking
                  </p>
                </div>
                <button 
                  onClick={addRound}
                  disabled={activePlayers.length < 4}
                  className={`${tc.primary} ${tc.primaryHover} disabled:bg-slate-300 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2`}
                >
                  <Play className="w-5 h-5" fill="currentColor" /> Generate Round {tournament.rounds.length + 1}
                </button>
              </div>
            )}

            {tournament.rounds.length > 0 ? (
              <>
                <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-sm border border-slate-200 p-6 md:p-10 flex items-center justify-between">
                  <button disabled={currentRoundIndex === 0} onClick={() => setCurrentRoundIndex(i => i - 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-0"><ChevronLeft className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
                  <div className="text-center">
                    {tournament.rounds[currentRoundIndex]?.matches.some(m => m.id.includes('championship')) ? (
                      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 mb-2">
                        <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Championship Round
                      </div>
                    ) : (
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400 block mb-1">Round</span>
                    )}
                    <div className="text-4xl md:text-7xl font-black text-slate-900 flex items-center justify-center gap-2">
                      {currentRoundIndex + 1}<span className="text-slate-300 text-base md:text-2xl font-bold">/ {tournament.rounds.length}</span>
                      {currentRoundIndex === tournament.rounds.length - 1 && tournament.mode !== 'event' && (
                        <button 
                          onClick={addRound} 
                          className={`ml-2 p-2 md:p-3 rounded-xl ${tc.primaryLight} hover:opacity-80 ${tc.primaryText} transition-all`}
                          title="Add another round"
                        >
                          <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button disabled={currentRoundIndex === tournament.rounds.length - 1} onClick={() => setCurrentRoundIndex(i => i + 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-0"><ChevronRight className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
                </div>
                <div className="grid gap-4 md:gap-8">
                  {(tournament.rounds[currentRoundIndex]?.matches || [])
                    .slice()
                    .sort((a, b) => a.courtIndex - b.courtIndex)
                    .map((match) => {
                    const teamAWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB;
                    const teamBWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA;
                    const winnerTextClass = "text-emerald-600";
                    const winnerInputClass = "!border-emerald-400 !bg-emerald-50 text-emerald-700";
                    const p1a = getPlayer(match.teamA[0]);
                    const p2a = getPlayer(match.teamA[1]);
                    const p1b = getPlayer(match.teamB[0]);
                    const p2b = getPlayer(match.teamB[1]);
                    return (
                      <div key={match.id} className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className={`px-6 md:px-12 py-3 md:py-5 border-b flex justify-between items-center font-black text-[9px] md:text-[10px] uppercase tracking-widest ${match.id.includes('championship') ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                          <span className="flex items-center gap-2">
                            {match.id.includes('championship') && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {match.id.includes('championship') ? 'Finals' : getCourtName(match.courtIndex)}
                          </span>
                          {match.isCompleted && <span className="text-emerald-500 flex items-center gap-1"><ShieldCheck size={12}/> Done</span>}
                        </div>
                        <div className="p-6 md:p-14 flex flex-col md:grid md:grid-cols-7 items-center gap-6 md:gap-8">
                          <div className="w-full md:col-span-2 text-center md:text-right space-y-3 md:space-y-4 pr-1">
                            <PlayerName name={p1a?.name || 'Unknown'} nickname={p1a?.nickname} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                            <PlayerName name={p2a?.name || 'Unknown'} nickname={p2a?.nickname} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                          </div>
                          <div className="w-full md:col-span-3 flex items-center justify-center gap-4 md:gap-6">
                            <input type="number" value={match.scoreA ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'A', e.target.value)} className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] ${tc.focusBorder} focus:bg-white transition-all outline-none ${teamAWon ? winnerInputClass : ''}`} placeholder="0" />
                            <span className="text-slate-200 font-black italic text-sm md:text-xl shrink-0">VS</span>
                            <input type="number" value={match.scoreB ?? ''} onChange={(e) => updateScore(currentRoundIndex, match.id, 'B', e.target.value)} className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] ${tc.focusBorder} focus:bg-white transition-all outline-none ${teamBWon ? winnerInputClass : ''}`} placeholder="0" />
                          </div>
                          <div className="w-full md:col-span-2 text-center md:text-left space-y-3 md:space-y-4 pl-1">
                            <PlayerName name={p1b?.name || 'Unknown'} nickname={p1b?.nickname} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
                            <PlayerName name={p2b?.name || 'Unknown'} nickname={p2b?.nickname} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
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
                      {tournament.rounds[currentRoundIndex].byes.map(id => {
                        const player = getPlayer(id);
                        return (
                        <div key={id} className="bg-white px-4 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-amber-200">
                            <PlayerName name={player?.name || ''} nickname={player?.nickname} baseClass="font-black text-sm md:text-xl" inline />
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 md:p-20 text-center border border-slate-200">
                <div className={`${tc.primary} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <Play className="w-8 h-8 text-white" fill="currentColor" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3">Ready to Play</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Generate the first round when your players are checked in. You can add or remove players between rounds.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && shareState.isSharing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 md:p-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Share2 className={`w-5 h-5 ${tc.primaryText}`} /> Share Tournament
                </h2>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Viewer Link */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-1.5">
                    <Monitor className="w-3 h-3" /> Viewer Link
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={shareState.shareUrl || ''} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700"
                    />
                    <button 
                      onClick={() => copyToClipboard(shareState.shareUrl || '', setCopiedUrl)}
                      className={`px-4 rounded-xl font-bold transition-all ${copiedUrl ? 'bg-emerald-500 text-white' : `${tc.primary} text-white`}`}
                    >
                      {copiedUrl ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Kiosk Link - only for event mode */}
                {tournament?.mode === 'event' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-1.5">
                      <Tablet className="w-3 h-3" /> Kiosk (Player Check-in)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/kiosk/${shareState.shareId}`} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700"
                      />
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/kiosk/${shareState.shareId}`, setCopiedKioskUrl)}
                        className={`px-4 rounded-xl font-bold transition-all ${copiedKioskUrl ? 'bg-emerald-500 text-white' : `${tc.primary} text-white`}`}
                      >
                        {copiedKioskUrl ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Link - only for event mode */}
                {tournament?.mode === 'event' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 flex items-center gap-1.5">
                      <Trophy className="w-3 h-3" /> Leaderboard Display
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/display/${shareState.shareId}`} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700"
                      />
                      <button 
                        onClick={() => copyToClipboard(`${window.location.origin}/display/${shareState.shareId}`, setCopiedDisplayUrl)}
                        className={`px-4 rounded-xl font-bold transition-all ${copiedDisplayUrl ? 'bg-emerald-500 text-white' : `${tc.primary} text-white`}`}
                      >
                        {copiedDisplayUrl ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-400">Anyone with these links can view. Only you can modify scores and generate rounds.</p>
                
                {/* Status */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${shareState.isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span className="text-sm font-bold text-slate-600">
                      {shareState.isSyncing ? 'Syncing...' : 'Live & Synced'}
                    </span>
                  </div>
                  {shareState.lastSynced && (
                    <span className="text-[10px] text-slate-400">
                      Last: {shareState.lastSynced.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <button 
                  onClick={stopSharing}
                  className="w-full py-3 text-rose-500 hover:bg-rose-50 rounded-xl font-bold text-sm transition-colors"
                >
                  Stop Sharing
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            {/* Final Standings - shows after championship is complete */}
            {(() => {
              const championshipRound = tournament?.rounds.find(r => 
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
              
              const getPlayerStats = (id: string) => leaderboard.find(e => e.playerId === id);
              const getChampPlayer = (id: string) => tournament?.players.find(p => p.id === id);
              const getPlayerNameStr = (id: string) => {
                const p = getChampPlayer(id);
                return p ? (p.nickname ? `${p.name} "${p.nickname}"` : p.name) : 'Unknown';
              };
              
              const allFinalists = [...winningTeam, ...runnerUpTeam]
                .map(id => ({ id, name: getPlayerNameStr(id), stats: getPlayerStats(id) }))
                .sort((a, b) => (b.stats?.totalPoints || 0) - (a.stats?.totalPoints || 0));
              
              const placeLabels = ['🥇', '🥈', '🥉', '4th'];
              
              return (
                <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 rounded-3xl md:rounded-[3rem] p-6 md:p-8 border-2 border-yellow-300 shadow-lg">
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 justify-center mb-6">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" /> Championship Results
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-white text-center shadow-lg">
                      <div className="text-3xl mb-2">🏆</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Champions</div>
                      <div className="font-black text-xl md:text-2xl italic">
                        {getPlayerNameStr(winningTeam[0])} & {getPlayerNameStr(winningTeam[1])}
                      </div>
                      <div className="text-2xl font-black mt-2">{winningScore}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl p-5 text-slate-700 text-center shadow-lg">
                      <div className="text-3xl mb-2">🥈</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Runner Up</div>
                      <div className="font-black text-xl md:text-2xl italic">
                        {getPlayerNameStr(runnerUpTeam[0])} & {getPlayerNameStr(runnerUpTeam[1])}
                      </div>
                      <div className="text-2xl font-black mt-2">{losingScore}</div>
                    </div>
                  </div>
                  
                  <div className="border-t-2 border-yellow-300 pt-5">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 text-center mb-4">
                      Individual Rankings (by tournament points)
                    </div>
                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                      {allFinalists.map((entry, idx) => (
                        <div key={entry.id} className="bg-white/60 rounded-xl p-3 text-center">
                          <div className="text-lg md:text-2xl">{placeLabels[idx]}</div>
                          <div className="font-black text-sm md:text-base italic truncate mt-1">
                            {entry.name}
                          </div>
                          <div className="text-xs text-slate-500 font-bold">
                            {entry.stats?.totalPoints || 0} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Championship Round Button */}
            {leaderboard.length >= 4 && !tournament?.rounds.some(r => r.matches.some(m => m.id.includes('championship'))) && (
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
                <div className="flex items-center gap-3">
                  {isEvent && (
                    <button
                      onClick={() => setHideTotogians(!hideTotogians)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        hideTotogians
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-500 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      {hideTotogians ? 'Prize View' : 'All Players'}
                    </button>
                  )}
                  <span className="hidden md:inline text-slate-400 text-xs font-black uppercase tracking-widest italic text-right">Sorted by Pts → Wins → Diff</span>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-hidden no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/30 text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-4 md:px-12 py-4 md:py-8">Rank</th>
                      <th className="px-4 md:px-12 py-4 md:py-8">Athlete</th>
                      {isEvent && <th className="px-4 md:px-8 py-4 md:py-8 text-center">Skill</th>}
                      <th className="px-4 md:px-12 py-4 md:py-8 text-center">Record (W-L-T)</th>
                      <th className="px-4 md:px-12 py-4 md:py-8 text-right">{isEvent ? tc.primaryText : 'text-indigo-600'} Total Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayLeaderboard.map((entry, idx) => {
                      const prizeRank = getPrizeRank(entry.playerId);
                      const overallIdx = leaderboard.findIndex(e => e.playerId === entry.playerId);
                      const displayRank = hideTotogians ? idx : overallIdx;
                      
                      const getRankStyle = () => {
                        if (entry.isTotogian) return 'bg-purple-100 text-purple-400';
                        const rank = isEvent ? prizeRank : displayRank;
                        if (rank === 0) return 'bg-yellow-400 text-white shadow-lg';
                        if (rank === 1) return 'bg-slate-200 text-slate-600';
                        if (rank === 2) return 'bg-orange-300 text-white';
                        return 'text-slate-400';
                      };
                      
                      return (
                        <tr key={entry.playerId} className={`hover:bg-slate-50/50 transition-colors ${entry.isTotogian ? 'opacity-50' : ''}`}>
                          <td className="px-4 md:px-12 py-6 md:py-10">
                            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-xl ${getRankStyle()}`}>
                              {displayRank + 1}
                            </div>
                          </td>
                          <td className="px-4 md:px-12 py-6 md:py-10">
                            <div className="flex items-center gap-2">
                              <PlayerName name={entry.playerName} nickname={entry.playerNickname} baseClass="font-black text-slate-900 text-lg md:text-2xl italic uppercase" inline />
                              {entry.isTotogian && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-500 whitespace-nowrap">Totogi</span>
                              )}
                            </div>
                            <div className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">Avg {entry.avgPoints} / Match</div>
                          </td>
                          {isEvent && (
                            <td className="px-4 md:px-8 py-6 md:py-10 text-center">
                              {(() => {
                                const player = tournament?.players.find(p => p.id === entry.playerId);
                                const skill = player?.skillLevel || 'medium';
                                return (
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                                    {skill}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
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
                      );
                    })}
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
