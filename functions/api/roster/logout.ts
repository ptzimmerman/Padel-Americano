import type { Env } from '../../types';
import { clearedSessionCookie } from '../../rosterSession';

// POST /api/roster/logout — clears the organizer session
export const onRequestPost: PagesFunction<Env> = async (context) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearedSessionCookie(context.request),
    },
  });
};
