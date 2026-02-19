const TOTOGI_REPLACEMENTS: [RegExp, string][] = [
  [/<title>.*?<\/title>/, '<title>Totogi Padel Invitational</title>'],
  [/content="Padel Americano — Tournament Manager"/g, 'content="Totogi Padel Invitational"'],
  [/content="Padel Americano"/g, 'content="Totogi Padel Invitational"'],
  [/content="Generate round-robin Padel Americano schedules, track scores, and view live leaderboards\."/g,
    'content="Skill-balanced matchmaking, live scoring, and real-time leaderboards. MWC Barcelona 2026."'],
  [/content="\/og-image\.png"/g, 'content="__ORIGIN__/totogi-og-image.png"'],
  [/content="\/favicon\.png"/g, 'content="/totogi-padel-logo.png"'],
  [/href="\/favicon\.png"/g, 'href="/totogi-padel-logo.png"'],
];

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const url = new URL(context.request.url);
  const origin = url.origin;
  const isTotogi = url.hostname.includes('totogi');

  let html = await response.text();

  // Always make OG image URLs absolute
  html = html.replace(/content="\/og-image\.png"/g, `content="${origin}/og-image.png"`);

  if (isTotogi) {
    for (const [pattern, replacement] of TOTOGI_REPLACEMENTS) {
      html = html.replace(pattern, replacement.replace('__ORIGIN__', origin));
    }
  }

  return new Response(html, {
    status: response.status,
    headers: response.headers,
  });
};
