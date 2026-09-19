interface Env {
  ASSETS: any;
  TO_EMAIL?: string;
  FROM_EMAIL?: string;
  FROM_NAME?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

// Anti-spam gate settings. Keep in sync with src/pages/contact.astro.
const TURNSTILE_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'contact';
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;
const HONEYPOT_FIELD = 'website';
const ELAPSED_FIELD = 'elapsed';
const MIN_ELAPSED_MS = 3000;

interface ContactFormData {
  name: string;
  email: string;
  message: string;
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

  console.log('Sending email with Resend:', {
    to: toEmail,
    from: fromEmail,
    subject: `New Contact Form Submission from ${data.name}`
  });

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
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    console.log('Resend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend error:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('Email sent successfully via Resend:', result.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Cheap bot checks that need no network call. Returns true when the submission
// looks automated: honeypot filled, or the form was submitted faster than a
// human could fill it. The client computes `elapsed` itself, so clock skew
// between visitor and server cannot reject real people.
function looksLikeBot(formData: FormData): boolean {
  const honeypot = formData.get(HONEYPOT_FIELD)?.toString() ?? '';
  if (honeypot.trim() !== '') return true;

  const elapsedRaw = formData.get(ELAPSED_FIELD)?.toString() ?? '';
  const elapsed = Number(elapsedRaw);
  if (elapsedRaw === '' || !Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) return true;

  return false;
}

// Verify a Turnstile token with Cloudflare. Fails closed on any error.
async function verifyTurnstile(
  token: string | null,
  secret: string,
  remoteip: string | null,
  expectedHostname: string,
): Promise<boolean> {
  if (!token || token.length > TURNSTILE_MAX_TOKEN_LENGTH) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);

  try {
    const response = await fetch(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error('Turnstile siteverify HTTP error:', response.status);
      return false;
    }
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      'error-codes'?: string[];
    };
    if (!result.success) {
      console.log('Turnstile rejected token:', result['error-codes']);
      return false;
    }
    if (result.hostname !== expectedHostname) {
      console.log('Turnstile hostname mismatch:', result.hostname, '!=', expectedHostname);
      return false;
    }
    if (result.action !== TURNSTILE_ACTION) {
      console.log('Turnstile action mismatch:', result.action);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Turnstile siteverify failed:', error);
    return false;
  }
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

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

    // Handle contact form submission
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      try {
        console.log('Contact form submission received');
        
        const formData = await request.formData();
        console.log('Form data keys:', Array.from(formData.keys()));
        
        const contactData = validateContactForm(formData);

        if (!contactData) {
          console.log('Invalid form data received');
          return new Response(
            JSON.stringify({ error: 'Invalid form data. Please check all fields.' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        // Honeypot / timing: answer like a success so bots learn nothing, send nothing.
        if (looksLikeBot(formData)) {
          console.log('Submission dropped by honeypot/timing gate');
          return new Response(
            JSON.stringify({ success: true, message: 'Message sent successfully!' }),
            { status: 200, headers: jsonHeaders }
          );
        }

        if (!env.TURNSTILE_SECRET_KEY) {
          console.error('TURNSTILE_SECRET_KEY environment variable is not set');
          return new Response(
            JSON.stringify({ error: 'Contact form is not configured. Please try again later.' }),
            { status: 500, headers: jsonHeaders }
          );
        }

        const verified = await verifyTurnstile(
          formData.get('cf-turnstile-response')?.toString() ?? null,
          env.TURNSTILE_SECRET_KEY,
          request.headers.get('CF-Connecting-IP'),
          url.hostname,
        );
        if (!verified) {
          return new Response(
            JSON.stringify({ error: 'Verification failed. Please reload the page and try again.' }),
            { status: 400, headers: jsonHeaders }
          );
        }

        console.log('Form validation passed, sending email...');
        const emailSent = await sendEmail(contactData, env);

        if (!emailSent) {
          console.log('Email sending failed');
          return new Response(
            JSON.stringify({ error: 'Failed to send email. Please try again later.' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            }
          );
        }

        console.log('Email sent successfully');
        return new Response(
          JSON.stringify({ success: true, message: 'Message sent successfully!' }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (error) {
        console.error('Contact form error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
          JSON.stringify({ error: 'Internal server error: ' + errorMessage }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // If the assets binding is missing, return a clear error in dev.
    if (!env || !env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('ASSETS binding is not configured. Ensure [assets] binding = "ASSETS" in wrangler.toml', { status: 500 });
    }

    // Try to serve a static asset first
    let res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;

    // SPA-style fallback: if not an asset path, serve index.html
    const isAsset = /\.[a-z0-9]+$/i.test(url.pathname);
    if (!isAsset) {
      const indexReq = new Request(new URL('/index.html', url), request);
      res = await env.ASSETS.fetch(indexReq);
      if (res.status !== 404) return res;
    }

    return new Response('Not Found', { status: 404 });
  },
};