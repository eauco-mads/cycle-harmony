// My Rhythm · Airtable + GHL Proxy Worker
// Deploy this at cloudflare.com → Workers & Pages → Create Worker
// Environment variables needed:
//   AT_TOKEN     = your Airtable personal access token
//   AT_BASE      = appt4CpS6Z5KBYkvA
//   GHL_TOKEN    = your GHL Private Integration token
//   GHL_LOCATION = UoEoLVrsEQizsJhdQmGX

const ALLOWED_ORIGIN = 'https://eauco-mads.github.io';
const AT_URL = 'https://api.airtable.com/v0';
const GHL_URL = 'https://services.leadconnectorhq.com';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const parts = url.pathname.slice(1).split('/');

    // POST /subscribe → { name, email } → tags contact in GHL as a subscriber
    if (parts[0] === 'subscribe' && request.method === 'POST') {
      const { name, email } = await request.json();
      if (!email) {
        return new Response(JSON.stringify({ error: 'email required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const ghlRes = await fetch(`${GHL_URL}/contacts/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GHL_TOKEN}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: env.GHL_LOCATION,
          email,
          firstName: name || '',
          tags: ['cycle-harmony-subscriber'],
        }),
      });
      const body = await ghlRes.text();
      return new Response(body, { status: ghlRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse: /table/Members?... or /table/Checkins?...
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
