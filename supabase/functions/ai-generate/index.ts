const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.shadowascent.app',
  'https://shadowascent.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function jsonResponse(request: Request, body: Record<string, unknown>, status = 200) {
  const requestOrigin = request?.headers?.get?.('origin') || '';
  const configuredOrigins = String(Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((origin) => origin?.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
  const responseOrigin = allowedOrigins?.has(requestOrigin) ? requestOrigin : DEFAULT_ALLOWED_ORIGINS?.[0];

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': responseOrigin,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      Vary: 'Origin',
    },
  });
}

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data?.output_text === 'string') {
    return data?.output_text;
  }

  const output = Array.isArray(data?.output) ? data?.output : [];
  const parts = output
    ?.flatMap((item) => (Array.isArray(item?.content) ? item?.content : []))
    ?.map((content) => content?.text || content?.value || '')
    ?.filter(Boolean);

  return parts?.join('\n\n') || '';
}

async function hasValidUser(request: Request) {
  const authorization = request?.headers?.get?.('authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization,
      },
    });

    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

Deno.serve(async (request: Request) => {
  if (request?.method === 'OPTIONS') {
    return jsonResponse(request, { ok: true });
  }

  if (request?.method !== 'POST') {
    return jsonResponse(request, { message: 'Method not allowed.' }, 405);
  }

  if (!(await hasValidUser(request))) {
    return jsonResponse(request, { message: 'Sign in to use the AI forge.' }, 401);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
  const baseUrl = String(Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5.5';

  if (!apiKey) {
    return jsonResponse(request, { message: 'The AI forge is not configured yet.' }, 503);
  }

  let payload: Record<string, unknown> = {};

  try {
    payload = await request?.json?.();
  } catch {
    return jsonResponse(request, { message: 'The AI request could not be read.' }, 400);
  }

  const instructions = String(payload?.instructions || '').trim();
  const text = String(payload?.text || '').trim();
  const imageDataUrl = String(payload?.imageDataUrl || '');
  const validImage = !imageDataUrl || /^data:image\/(png|jpe?g|webp);base64,/i.test(imageDataUrl);

  if (!instructions || !text || instructions?.length > 4000 || text?.length > 24000 || imageDataUrl?.length > 8_000_000 || !validImage) {
    return jsonResponse(request, { message: 'The AI request is invalid or too large.' }, 400);
  }

  const content: Array<Record<string, string>> = [{ type: 'input_text', text }];

  if (imageDataUrl) {
    content?.push({ type: 'input_image', image_url: imageDataUrl });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller?.abort?.(), 60_000);

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions,
        input: [{ role: 'user', content }],
        max_output_tokens: 5000,
        store: false,
      }),
      signal: controller?.signal,
    });

    if (!response?.ok) {
      return jsonResponse(request, { message: 'The AI forge could not complete that request.' }, 502);
    }

    const data = await response?.json?.();
    const outputText = extractResponseText(data || {});

    if (!outputText?.trim()) {
      return jsonResponse(request, { message: 'The AI forge returned an empty result.' }, 502);
    }

    return jsonResponse(request, { text: outputText?.trim() });
  } catch {
    return jsonResponse(request, { message: 'The AI forge is unavailable right now.' }, 502);
  } finally {
    clearTimeout(timeoutId);
  }
});
