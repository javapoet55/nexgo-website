import {isIP} from 'node:net';
import {clientAddress,createLimiter,setting} from './abuse-guard.mjs';

let geolocation;
const configuredEndpoint = process.env.QR_ANALYTICS_URL;
const token = process.env.QR_ANALYTICS_TOKEN;

// One scan is one open. Without these, anyone requesting /get-app?source=hero-qr in a loop
// would fill the scan report with invented opens and send a write to the app for each one.
const perVisitor = createLimiter({limit: setting('QR_OPENS_PER_VISITOR', 3), windowMs: 10 * 60_000});
const perMinute = createLimiter({limit: setting('QR_OPENS_PER_MINUTE', 120), windowMs: 60_000});
const maxInFlight = 8;
let inFlight = 0;

export function recordHeroQrOpen(req, destination) {
  if (!configuredEndpoint || !token || req.method !== 'GET') return;
  const headers = req.headers;
  const agent = headers['user-agent'] || '';
  const purpose = [headers['purpose'], headers['sec-purpose'], headers['x-purpose']].join(' ');
  if (!agent || /prefetch|prerender|preview/i.test(purpose) || /bot\b|crawler|spider|preview|facebookexternalhit/i.test(agent)) return;
  if (inFlight >= maxInFlight || !perVisitor.take(clientAddress(req) || 'unknown') || !perMinute.take('all')) return;
  const platform = destination.startsWith('https://play.google.com/') ? 'android'
    : destination.startsWith('https://apps.apple.com/') ? 'ios' : 'other';
  const hint = headers['sec-ch-ua-model']?.match(/^"([^"]+)"$/)?.[1];
  const androidModel = agent.match(/Android [^;)]+;\s*([^;)]+?)(?:\s+Build\/[\w.-]+)?\)/i)?.[1];
  const candidate = hint || (platform === 'android' ? androidModel : null);
  const model = candidate && !/^(K|wv|Android)$/i.test(candidate) ? candidate.slice(0, 80) : null;
  const ip = headers['x-real-ip'];
  const openedAt = new Date().toISOString();

  inFlight++;
  void (async () => {
    let location;
    if (ip && isIP(ip)) {
      try {
        geolocation ??= import('geoip-lite');
        location = (await geolocation).default.lookup(ip);
      } catch {
        // A lookup failure still records the open.
      }
    }
    const response = await fetch(configuredEndpoint, {
      method: 'POST',
      headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        openedAt, platform, model, country: location?.country || null,
        region: location?.region || null, city: location?.city || null,
      }),
      signal: AbortSignal.timeout(4000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('QR event returned HTTP ' + response.status);
    await response.body?.cancel();
  })().catch(error => console.warn('Unable to record hero QR open:', error.message)).finally(() => { inFlight--; });
}
