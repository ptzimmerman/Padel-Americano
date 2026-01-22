import type { Env, SharedTournament, CreateGameResponse, ErrorResponse } from '../types';
import { hashPin, generateId, generatePin, TTL_SECONDS } from '../types';

interface PagesContext {
  request: Request;
  env: Env;
}

// POST /api/game - Create a new shared tournament
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { tournament: SharedTournament['tournament'] };
    
    if (!body.tournament) {
      return Response.json({ error: 'Tournament data is required' } as ErrorResponse, { status: 400 });
    }

    const id = generateId();
    const pin = generatePin();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000);

    const sharedTournament: SharedTournament = {
      id,
      pinHash: hashPin(pin),
      tournament: body.tournament,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await env.TOURNAMENTS.put(id, JSON.stringify(sharedTournament), {
      expirationTtl: TTL_SECONDS,
    });

    const response: CreateGameResponse = {
      id,
      pin,
      shareUrl: `/game/${id}`,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return Response.json({ error: 'Failed to create game' } as ErrorResponse, { status: 500 });
  }
};
