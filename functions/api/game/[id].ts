import type { Env, SharedTournament, ErrorResponse } from '../../types';
import { hashPin, TTL_SECONDS } from '../../types';

// GET /api/game/:id - Get tournament data (public, no PIN required)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const id = params.id as string;

  try {
    const data = await env.TOURNAMENTS.get(id);
    
    if (!data) {
      return Response.json({ error: 'Tournament not found' } as ErrorResponse, { status: 404 });
    }

    const sharedTournament: SharedTournament = JSON.parse(data);
    
    // Return tournament data without the PIN hash
    return Response.json({
      id: sharedTournament.id,
      tournament: sharedTournament.tournament,
      createdAt: sharedTournament.createdAt,
      expiresAt: sharedTournament.expiresAt,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    return Response.json({ error: 'Failed to fetch game' } as ErrorResponse, { status: 500 });
  }
};

// PUT /api/game/:id - Update tournament scores (requires PIN)
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;
  const pin = request.headers.get('X-Tournament-Pin');

  if (!pin) {
    return Response.json({ error: 'PIN is required' } as ErrorResponse, { status: 401 });
  }

  try {
    const data = await env.TOURNAMENTS.get(id);
    
    if (!data) {
      return Response.json({ error: 'Tournament not found' } as ErrorResponse, { status: 404 });
    }

    const sharedTournament: SharedTournament = JSON.parse(data);
    
    // Verify PIN
    if (hashPin(pin) !== sharedTournament.pinHash) {
      return Response.json({ error: 'Invalid PIN' } as ErrorResponse, { status: 403 });
    }

    const body = await request.json() as { tournament: SharedTournament['tournament'] };
    
    if (!body.tournament) {
      return Response.json({ error: 'Tournament data is required' } as ErrorResponse, { status: 400 });
    }

    // Update tournament data
    sharedTournament.tournament = body.tournament;

    // Calculate remaining TTL
    const expiresAt = new Date(sharedTournament.expiresAt);
    const now = new Date();
    const remainingTtl = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    await env.TOURNAMENTS.put(id, JSON.stringify(sharedTournament), {
      expirationTtl: remainingTtl > 0 ? remainingTtl : TTL_SECONDS,
    });

    return Response.json({
      id: sharedTournament.id,
      tournament: sharedTournament.tournament,
      createdAt: sharedTournament.createdAt,
      expiresAt: sharedTournament.expiresAt,
    });
  } catch (error) {
    console.error('Error updating game:', error);
    return Response.json({ error: 'Failed to update game' } as ErrorResponse, { status: 500 });
  }
};

// DELETE /api/game/:id - Delete tournament (requires PIN)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const id = params.id as string;
  const pin = request.headers.get('X-Tournament-Pin');

  if (!pin) {
    return Response.json({ error: 'PIN is required' } as ErrorResponse, { status: 401 });
  }

  try {
    const data = await env.TOURNAMENTS.get(id);
    
    if (!data) {
      return Response.json({ error: 'Tournament not found' } as ErrorResponse, { status: 404 });
    }

    const sharedTournament: SharedTournament = JSON.parse(data);
    
    // Verify PIN
    if (hashPin(pin) !== sharedTournament.pinHash) {
      return Response.json({ error: 'Invalid PIN' } as ErrorResponse, { status: 403 });
    }

    await env.TOURNAMENTS.delete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return Response.json({ error: 'Failed to delete game' } as ErrorResponse, { status: 500 });
  }
};
