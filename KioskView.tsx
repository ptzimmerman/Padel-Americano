import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Tournament, Player } from './types';
import { 
  UserPlus, 
  UserMinus, 
  Loader2, 
  Info, 
  Plus, 
  Check,
  Users,
  Zap,
  Trophy
} from 'lucide-react';

const SKILL_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
};

const POLL_INTERVAL = 3000;

const KioskView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  
  // Add player form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTotogian, setNewTotogian] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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

  const activePlayers = useMemo(() => 
    tournament?.players.filter(p => p.isActive !== false) || [],
  [tournament]);

  const inactivePlayers = useMemo(() => 
    tournament?.players.filter(p => p.isActive === false) || [],
  [tournament]);

  const togglePlayer = async (playerId: string) => {
    if (!tournament || toggling) return;
    setToggling(playerId);
    
    try {
      const response = await fetch(`/api/game/${id}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action: 'toggle' }),
      });
      if (response.ok) {
        const data = await response.json();
        setTournament(data.tournament);
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(null);
    }
  };

  const addNewPlayer = async () => {
    if (!newName.trim() || isAdding) return;
    setIsAdding(true);
    
    try {
      const response = await fetch(`/api/game/${id}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          player: {
            id: crypto.randomUUID(),
            name: newName.trim(),
            skillLevel: newSkill,
            isTotogian: newTotogian,
            isActive: true,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setTournament(data.tournament);
        setNewName('');
        setNewTotogian(false);
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Add player failed:', err);
    } finally {
      setIsAdding(false);
    }
  };

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
          <p className="text-slate-500">This tournament may have expired.</p>
        </div>
      </div>
    );
  }

  const currentRound = tournament.rounds.length;
  const allComplete = tournament.rounds.length > 0 && 
    tournament.rounds[tournament.rounds.length - 1].matches.every(m => m.isCompleted);

  return (
    <div className="min-h-screen bg-purple-950 font-inter antialiased">
      {/* Header */}
      <header className="bg-purple-900/50 border-b border-purple-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/totogi-padel-logo.png" alt="Totogi" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-lg font-black text-white tracking-tight italic">PLAYER CHECK-IN</h1>
              <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">Tap to join or sit out</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-purple-400 text-[10px] font-bold uppercase tracking-wider">Round</div>
            <div className="text-2xl font-black text-white">
              {currentRound > 0 ? currentRound : '—'}
            </div>
          </div>
        </div>
      </header>

      {/* Status bar */}
      <div className="bg-purple-900/30 border-b border-purple-800/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm font-bold">{activePlayers.length} active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${allComplete || currentRound === 0 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-purple-400 text-sm font-bold">
                {currentRound === 0 ? 'Waiting to start' : allComplete ? 'Round complete' : 'Playing...'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Player
          </button>
        </div>
      </div>

      {/* Add player form */}
      {showAddForm && (
        <div className="bg-purple-900/60 border-b border-purple-800/50 px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewPlayer()}
              placeholder="Player name..."
              autoFocus
              className="w-full bg-purple-950 border-2 border-purple-700 rounded-2xl px-5 py-4 text-white font-bold text-lg placeholder:text-purple-700 focus:outline-none focus:border-purple-400"
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-purple-500 text-xs font-bold uppercase tracking-wider">Skill:</span>
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setNewSkill(level)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    newSkill === level
                      ? `${SKILL_COLORS[level].bg} ${SKILL_COLORS[level].text} border-2 ${SKILL_COLORS[level].border}`
                      : 'bg-purple-900 text-purple-500 border-2 border-transparent'
                  }`}
                >
                  {level}
                </button>
              ))}
              <div className="w-px h-6 bg-purple-700 mx-1" />
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${newTotogian ? 'bg-purple-500 border-purple-500' : 'border-purple-600'}`}>
                  {newTotogian && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <input type="checkbox" checked={newTotogian} onChange={(e) => setNewTotogian(e.target.checked)} className="sr-only" />
                <span className="text-xs font-bold text-purple-400">Totogian</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addNewPlayer}
                disabled={!newName.trim() || isAdding}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Tournament
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-3 rounded-xl text-purple-500 hover:bg-purple-900 font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player grid */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Active players */}
        <h3 className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3 h-3" /> Active for Next Round ({activePlayers.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {activePlayers.map(player => (
            <button
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              disabled={toggling === player.id}
              className="bg-purple-800/60 hover:bg-purple-700/60 border-2 border-purple-600/40 rounded-2xl p-4 text-left transition-all active:scale-95 disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  {toggling === player.id ? (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <UserMinus className="w-4 h-4 text-purple-600 group-hover:text-rose-400 transition-colors" />
              </div>
              <div className="font-black text-white text-base truncate">{player.name}</div>
              <div className="flex items-center gap-2 mt-1.5">
                {player.skillLevel && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${SKILL_COLORS[player.skillLevel].bg} ${SKILL_COLORS[player.skillLevel].text}`}>
                    {player.skillLevel}
                  </span>
                )}
                {player.isTotogian && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-200 text-purple-700">
                    Totogi
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Inactive players */}
        {inactivePlayers.length > 0 && (
          <>
            <h3 className="text-purple-600 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <UserMinus className="w-3 h-3" /> Sitting Out ({inactivePlayers.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inactivePlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  disabled={toggling === player.id}
                  className="bg-purple-950/60 hover:bg-purple-900/60 border-2 border-purple-800/30 rounded-2xl p-4 text-left transition-all active:scale-95 disabled:opacity-50 opacity-50 hover:opacity-80"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center">
                      {toggling === player.id ? (
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <UserPlus className="w-4 h-4 text-purple-800 hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="font-black text-purple-400 text-base truncate">{player.name}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {player.skillLevel && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase opacity-60 ${SKILL_COLORS[player.skillLevel].bg} ${SKILL_COLORS[player.skillLevel].text}`}>
                        {player.skillLevel}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Bottom status */}
      <div className="fixed bottom-0 left-0 right-0 bg-purple-950/95 backdrop-blur-md border-t border-purple-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-purple-400 text-xs font-bold">Live sync every 3s</span>
          </div>
          <span className="text-purple-600 text-xs font-bold">
            {tournament.numCourts} courts • Games to 16
          </span>
        </div>
      </div>
    </div>
  );
};

export default KioskView;
