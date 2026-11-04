import type { Env, ErrorResponse } from '../../types';
import { passwordMatches, sessionCookie } from '../../rosterSession';

// POST /api/roster/login — organizer password, sets an httpOnly session cookie
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const password = env.ROSTER_PASSWORD;
  if (!password) {
    return Response.json(
      { error: 'Roster sign-in is not configured' } as ErrorResponse,
      { status: 503 },
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json() as { password?: unknown };
  } catch {
    return Response.json({ error: 'Password is required' } as ErrorResponse, { status: 400 });
  }
  if (typeof body.password !== 'string' || !body.password) {
    return Response.json({ error: 'Password is required' } as ErrorResponse, { status: 400 });
  }

  if (!await passwordMatches(body.password, password)) {
    return Response.json({ error: 'Wrong password' } as ErrorResponse, { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': await sessionCookie(password, request),
    },
  });
};
