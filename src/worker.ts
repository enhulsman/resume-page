interface Env {
  ASSETS: any;
  TO_EMAIL?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
  RESEND_API_KEY?: string;
  // Cloudflare Turnstile secret. When set, the contact endpoint enforces a valid
  // `cf-turnstile-response` token. When unset (e.g. not yet provisioned), Turnstile
  // verification is skipped so the form keeps working — honeypot + CORS still apply.
  // Provision with: npx wrangler secret put TURNSTILE_SECRET
  TURNSTILE_SECRET?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

const PROD_ORIGIN = 'https://hulsman.dev';
const DEV_ORIGIN = 'http://localhost:4321';

// Resolve an allowed CORS origin from the request URL. The contact form is same-origin
// in production; we only need to permit the site itself and the local dev server.
function resolveCorsOrigin(url: URL): string {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? DEV_ORIGIN : PROD_ORIGIN;
}

function corsHeaders(url: URL): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(url),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, url: URL): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(url) },
  });
}

// Verify a Turnstile token against Cloudflare's siteverify endpoint.
async function verifyTurnstile(token: string, secret: string, ip?: string | null): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Helper function to send email via Resend
async function sendEmail(data: ContactFormData, env: Env): Promise<boolean> {
  const toEmail = env.TO_EMAIL || 'your-email@example.com';
  const fromEmail = env.FROM_EMAIL || 'contact@yourdomain.com';
  const fromName = env.FROM_NAME || 'Contact Form';

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY environment variable is not set');
    return false;
  }

  const emailData = {
    from: `${fromName} <${fromEmail}>`,
    to: [toEmail],
    subject: `New Contact Form Submission from ${data.name}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${data.name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.email}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #374151; margin-bottom: 10px;">Message:</h3>
              <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; border-radius: 4px;">
                ${data.message.replace(/\n/g, '<br>')}
              </div>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p>This message was sent via your website contact form.</p>
              <p><strong>Reply to:</strong> ${data.email}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    reply_to: data.email,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', response.status, errorText);
      return false;
    }

    const result = (await response.json()) as { id?: string };
    console.log('Email sent successfully via Resend:', result.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Helper function to validate and sanitize form data
function validateContactForm(formData: FormData): ContactFormData | null {
  const name = formData.get('name')?.toString()?.trim();
  const email = formData.get('email')?.toString()?.trim();
  const message = formData.get('message')?.toString()?.trim();

  if (!name || !email || !message) {
    return null;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return null;
  }

  // Sanitize input (basic XSS prevention)
  const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').substring(0, 2000);

  return {
    name: sanitize(name),
    email: sanitize(email),
    message: sanitize(message),
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // A1: /resume.pdf is gated — no PDF ships to production. Send guessers to the resume page.
    if (url.pathname === '/resume.pdf') {
      return Response.redirect(new URL('/resume', url).toString(), 301);
    }

    // Handle contact form submission
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      try {
        const formData = await request.formData();

        // Honeypot: bots fill this hidden field; humans never see it. Return a success-shaped
        // response so bots don't retry, but never send an email.
        const honeypot = formData.get('website')?.toString()?.trim();
        if (honeypot) {
          console.warn('Honeypot triggered — dropping submission.');
          return jsonResponse({ success: true, message: 'Message sent successfully!' }, 200, url);
        }

        const contactData = validateContactForm(formData);
        if (!contactData) {
          return jsonResponse({ error: 'Invalid form data. Please check all fields.' }, 400, url);
        }

        // Turnstile — only enforced when a secret is configured (see Env.TURNSTILE_SECRET).
        if (env.TURNSTILE_SECRET) {
          const token = formData.get('cf-turnstile-response')?.toString();
          const ip = request.headers.get('cf-connecting-ip');
          if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET, ip))) {
            return jsonResponse({ error: 'Verification failed. Please try again.' }, 403, url);
          }
        }

        const emailSent = await sendEmail(contactData, env);
        if (!emailSent) {
          return jsonResponse({ error: 'Failed to send message. Please try again later.' }, 500, url);
        }

        return jsonResponse({ success: true, message: 'Message sent successfully!' }, 200, url);
      } catch (error) {
        // Error hygiene: log details server-side, return a generic message to the client.
        console.error('Contact form error:', error);
        return jsonResponse({ error: 'Something went wrong. Please try again later.' }, 500, url);
      }
    }

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(url) });
    }

    // If the assets binding is missing, return a clear error in dev.
    if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response(
        'ASSETS binding is not configured. Ensure [assets] binding = "ASSETS" in wrangler.toml',
        { status: 500 }
      );
    }

    // Try to serve a static asset first
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return assetRes;

    // A2: real 404 — serve the styled 404 page with a 404 status. This is a fully static site,
    // so there is no SPA/index.html fallback (that produced soft-404s with HTTP 200).
    const notFoundRes = await env.ASSETS.fetch(new Request(new URL('/404.html', url), { method: 'GET' }));
    if (notFoundRes.status === 200) {
      return new Response(notFoundRes.body, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
