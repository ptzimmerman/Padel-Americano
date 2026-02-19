// Rewrite og:image relative paths to absolute URLs so link previews work on any domain
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const url = new URL(context.request.url);
  const origin = url.origin;
  const html = await response.text();

  const rewritten = html.replace(
    /content="\/totogi-og-image\.png"/g,
    `content="${origin}/totogi-og-image.png"`
  );

  return new Response(rewritten, {
    status: response.status,
    headers: response.headers,
  });
};
