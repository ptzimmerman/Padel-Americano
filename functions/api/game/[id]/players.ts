import type { SharedTournament, ErrorResponse } from '../../../types';
import { TTL_SECONDS } from '../../../types';

interface Env {
  TOURNAMENTS: KVNamespace;
}

interface PlayerPatchBody {
  action: 'toggle' | 'add';
  playerId?: string;
  player?: {
    id: string;
    name: string;
    nickname?: string;
    skillLevel?: 'low' | 'medium' | 'high';
    isTotogian?: boolean;
    isActive?: boolean;
  };
}

// PATCH /api/game/:id/players - Toggle player active status or add player (no PIN required for kiosk)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;

  try {
    const data = await env.TOURNAMENTS.get(id);
    
    if (!data) {
      return Response.json({ error: 'Tournament not found' } as ErrorResponse, { status: 404 });
    }

    const sharedTournament: SharedTournament = JSON.parse(data);
    const body = await request.json() as PlayerPatchBody;

    if (body.action === 'toggle' && body.playerId) {
      const player = sharedTournament.tournament.players.find(p => p.id === body.playerId);
      if (!player) {
        return Response.json({ error: 'Player not found' } as ErrorResponse, { status: 404 });
      }
      player.isActive = player.isActive === false ? true : false;
    } else if (body.action === 'add' && body.player) {
      const existing = sharedTournament.tournament.players.find(
        p => p.name.toLowerCase() === body.player!.name.toLowerCase()
      );
      if (existing) {
        return Response.json({ error: 'Player with this name already exists' } as ErrorResponse, { status: 409 });
      }
      sharedTournament.tournament.players.push({
        id: body.player.id,
        name: body.player.name,
        nickname: body.player.nickname,
        skillLevel: body.player.skillLevel,
        isTotogian: body.player.isTotogian,
        isActive: body.player.isActive ?? true,
      });
    } else {
      return Response.json({ error: 'Invalid action' } as ErrorResponse, { status: 400 });
    }

    const expiresAt = new Date(sharedTournament.expiresAt);
    const now = new Date();
    const remainingTtl = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    await env.TOURNAMENTS.put(id, JSON.stringify(sharedTournament), {
      expirationTtl: remainingTtl > 0 ? remainingTtl : TTL_SECONDS,
    });

    return Response.json({
      id: sharedTournament.id,
      tournament: sharedTournament.tournament,
    });
  } catch (error) {
    console.error('Error updating players:', error);
    return Response.json({ error: 'Failed to update players' } as ErrorResponse, { status: 500 });
  }
};
