// My Rhythm · Airtable Proxy Worker
// Deploy this at cloudflare.com → Workers & Pages → Create Worker
// Then add environment variable AT_TOKEN = your Airtable token
// and AT_BASE = appt4CpS6Z5KBYkvA

const ALLOWED_ORIGIN = 'https://eauco-mads.github.io';
const AT_URL = 'https://api.airtable.com/v0';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Parse: /table/Members?... or /table/Checkins?...
    const url = new URL(request.url);
    const parts = url.pathname.slice(1).split('/'); // ['table', 'Members', optionalRecordId]
    if (parts[0] !== 'table' || !parts[1]) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    const table = parts[1];
    const recordId = parts[2] || '';
    const atPath = `${AT_URL}/${env.AT_BASE}/${encodeURIComponent(table)}${recordId ? '/' + recordId : ''}${url.search}`;

    const atReq = new Request(atPath, {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${env.AT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PATCH'].includes(request.method) ? await request.text() : undefined,
    });

    const atRes = await fetch(atReq);
    const body = await atRes.text();

    return new Response(body, {
      status: atRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
