// Tests for the Cloudflare Worker fetch handler — routing (A1/A2) and contact-form
// hardening (A3). Run with: npm test  (node --test, uses Node's built-in TS stripping)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.ts';

// --- Test doubles ---------------------------------------------------------

// A mock ASSETS binding. Known paths return 200; everything else 404 (as the real
// ASSETS binding does for unknown routes).
function makeAssets() {
  return {
    async fetch(req: Request) {
      const u = new URL(req.url);
      if (u.pathname === '/404.html') {
        return new Response('<!doctype html><html><body>404 — Page not found</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      if (['/', '/resume', '/contact', '/app.css'].includes(u.pathname)) {
        return new Response('asset body', { status: 200 });
      }
      return new Response('not found', { status: 404 });
    },
  };
}

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    ASSETS: makeAssets(),
    TO_EMAIL: 'to@example.com',
    FROM_EMAIL: 'from@example.com',
    FROM_NAME: 'Test',
    RESEND_API_KEY: 'test_key',
    ...overrides,
  } as any;
}

// Install a global fetch stub for the duration of a callback, then restore.
async function withFetch(
  handler: (input: string, init?: any) => Promise<Response> | Response,
  fn: () => Promise<void>
) {
  const original = globalThis.fetch;
  const calls: string[] = [];
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    calls.push(urlStr);
    return handler(urlStr, init);
  };
  try {
    await fn();
  } finally {
    (globalThis as any).fetch = original;
  }
  return calls;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND = 'https://api.resend.com/emails';

function okStubs(siteverifySuccess = true) {
  return (urlStr: string) => {
    if (urlStr.includes('siteverify')) {
      return new Response(JSON.stringify({ success: siteverifySuccess }), { status: 200 });
    }
    if (urlStr.startsWith(RESEND)) {
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    }
    return new Response('unexpected', { status: 500 });
  };
}

function contactRequest(fields: Record<string, string>, origin = 'http://localhost') {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new Request(`${origin}/api/contact`, { method: 'POST', body: fd });
}

const VALID = { name: 'Ada', email: 'ada@example.com', message: 'Hello there' };

// --- A1: /resume.pdf redirect --------------------------------------------

test('A1: GET /resume.pdf 301-redirects to /resume', async () => {
  const res = await worker.fetch(new Request('http://localhost/resume.pdf'), makeEnv());
  assert.equal(res.status, 301);
  assert.match(res.headers.get('location') || '', /\/resume$/);
});

// --- A2: real 404 ---------------------------------------------------------

test('A2: unknown path returns 404 with the styled 404 page body', async () => {
  const res = await worker.fetch(new Request('http://localhost/does-not-exist'), makeEnv());
  assert.equal(res.status, 404);
  const body = await res.text();
  assert.match(body, /404/);
});

test('A2: a missing asset-looking path also 404s (no SPA/index fallback)', async () => {
  const res = await worker.fetch(new Request('http://localhost/missing.js'), makeEnv());
  assert.equal(res.status, 404);
});

test('A2: a real static route still returns 200', async () => {
  const res = await worker.fetch(new Request('http://localhost/resume'), makeEnv());
  assert.equal(res.status, 200);
});

// --- A3: honeypot ---------------------------------------------------------

test('A3: filled honeypot returns success-shaped 200 but sends no email', async () => {
  let resBody: any;
  const calls = await withFetch(okStubs(), async () => {
    const res = await worker.fetch(
      contactRequest({ ...VALID, website: 'http://spam.example' }),
      makeEnv({ TURNSTILE_SECRET: 'sekret' })
    );
    assert.equal(res.status, 200);
    resBody = await res.json();
  });
  assert.equal(resBody.success, true);
  assert.equal(calls.length, 0, 'no outbound fetch (no Resend, no siteverify)');
});

// --- A3: Turnstile --------------------------------------------------------

test('A3: missing Turnstile token → 403 when secret is configured', async () => {
  const calls = await withFetch(okStubs(), async () => {
    const res = await worker.fetch(contactRequest(VALID), makeEnv({ TURNSTILE_SECRET: 'sekret' }));
    assert.equal(res.status, 403);
  });
  assert.ok(!calls.some((c) => c.startsWith(RESEND)), 'no email sent on failed verification');
});

test('A3: invalid Turnstile token → 403', async () => {
  await withFetch(okStubs(false), async () => {
    const res = await worker.fetch(
      contactRequest({ ...VALID, 'cf-turnstile-response': 'bad' }),
      makeEnv({ TURNSTILE_SECRET: 'sekret' })
    );
    assert.equal(res.status, 403);
  });
});

test('A3: valid flow with Turnstile → 200 and email sent', async () => {
  const calls = await withFetch(okStubs(true), async () => {
    const res = await worker.fetch(
      contactRequest({ ...VALID, 'cf-turnstile-response': 'good' }),
      makeEnv({ TURNSTILE_SECRET: 'sekret' })
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
  });
  assert.ok(calls.some((c) => c.includes('siteverify')), 'called siteverify');
  assert.ok(calls.some((c) => c.startsWith(RESEND)), 'called Resend');
});

test('A3: Turnstile skipped gracefully when no secret is set', async () => {
  const calls = await withFetch(okStubs(), async () => {
    const res = await worker.fetch(contactRequest(VALID), makeEnv({ TURNSTILE_SECRET: undefined }));
    assert.equal(res.status, 200);
  });
  assert.ok(!calls.some((c) => c.includes('siteverify')), 'siteverify not called');
  assert.ok(calls.some((c) => c.startsWith(RESEND)), 'email still sent');
});

// --- A3: validation, CORS, error hygiene ---------------------------------

test('A3: invalid form data → 400', async () => {
  await withFetch(okStubs(), async () => {
    const res = await worker.fetch(
      contactRequest({ name: '', email: 'nope', message: '' }),
      makeEnv({ TURNSTILE_SECRET: undefined })
    );
    assert.equal(res.status, 400);
  });
});

test('A3: CORS is scoped to the site origin, not *', async () => {
  await withFetch(okStubs(), async () => {
    const local = await worker.fetch(contactRequest(VALID, 'http://localhost'), makeEnv());
    assert.equal(local.headers.get('access-control-allow-origin'), 'http://localhost:4321');

    const prod = await worker.fetch(contactRequest(VALID, 'https://hulsman.dev'), makeEnv());
    assert.equal(prod.headers.get('access-control-allow-origin'), 'https://hulsman.dev');
  });
});

test('A3: OPTIONS preflight returns scoped CORS headers', async () => {
  const res = await worker.fetch(
    new Request('https://hulsman.dev/api/contact', { method: 'OPTIONS' }),
    makeEnv()
  );
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://hulsman.dev');
});

test('A3: internal errors return a generic message (no leak)', async () => {
  // Force sendEmail to throw by making the Resend fetch reject with a detailed error.
  await withFetch(
    (urlStr) => {
      if (urlStr.startsWith(RESEND)) throw new Error('SECRET_INTERNAL_DETAIL: db at 10.0.0.5 down');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    },
    async () => {
      const res = await worker.fetch(contactRequest(VALID), makeEnv({ TURNSTILE_SECRET: undefined }));
      // sendEmail catches its own fetch error and returns false → 500 generic.
      assert.equal(res.status, 500);
      const body = await res.text();
      assert.doesNotMatch(body, /SECRET_INTERNAL_DETAIL|10\.0\.0\.5/);
    }
  );
});
