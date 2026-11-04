import type { Env, ErrorResponse } from '../../types';
import { isRosterAuthed } from '../../rosterSession';
import { OWNER_ROSTER_KEY, initialOwnerRoster, parseOwnerPlayers, type OwnerPlayer } from '../../ownerRoster';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const unauthorized = (): Response =>
  json({ error: 'Sign in required' } satisfies ErrorResponse, 401);

const readStored = async (env: Env): Promise<OwnerPlayer[] | null> => {
  const raw = await env.TOURNAMENTS.get(OWNER_ROSTER_KEY);
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as { players?: unknown };
    return parseOwnerPlayers(parsed.players) ?? [];
  } catch {
    return [];
  }
};

// GET /api/roster — organizer's saved players. Seeds KV once, only for a signed-in request.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!env.ROSTER_PASSWORD) {
    return json({ error: 'Roster sign-in is not configured' } satisfies ErrorResponse, 503);
  }
  if (!await isRosterAuthed(request, env)) return unauthorized();

  const existing = await readStored(env);
  if (existing !== null) return json({ players: existing });

  const players = initialOwnerRoster();
  await env.TOURNAMENTS.put(OWNER_ROSTER_KEY, JSON.stringify({ players }));
  return json({ players });
};

// PUT /api/roster — replace the organizer's saved players
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (!env.ROSTER_PASSWORD) {
    return json({ error: 'Roster sign-in is not configured' } satisfies ErrorResponse, 503);
  }
  if (!await isRosterAuthed(request, env)) return unauthorized();

  let body: { players?: unknown };
  try {
    body = await request.json() as { players?: unknown };
  } catch {
    return json({ error: 'Players are required' } satisfies ErrorResponse, 400);
  }
  const players = parseOwnerPlayers(body.players);
  if (!players) return json({ error: 'Invalid player list' } satisfies ErrorResponse, 400);

  await env.TOURNAMENTS.put(OWNER_ROSTER_KEY, JSON.stringify({ players }));
  return json({ players });
};
