import {isIP} from 'node:net';

let geolocation;
const configuredEndpoint = process.env.QR_ANALYTICS_URL;
const token = process.env.QR_ANALYTICS_TOKEN;

export function recordHeroQrOpen(req, destination) {
  if (!configuredEndpoint || !token || req.method !== 'GET') return;
  const headers = req.headers;
  const agent = headers['user-agent'] || '';
  const purpose = [headers['purpose'], headers['sec-purpose'], headers['x-purpose']].join(' ');
  if (!agent || /prefetch|prerender|preview/i.test(purpose) || /bot\b|crawler|spider|preview|facebookexternalhit/i.test(agent)) return;
  const platform = destination.startsWith('https://play.google.com/') ? 'android'
    : destination.startsWith('https://apps.apple.com/') ? 'ios' : 'other';
  const hint = headers['sec-ch-ua-model']?.match(/^"([^"]+)"$/)?.[1];
  const androidModel = agent.match(/Android [^;)]+;\s*([^;)]+?)(?:\s+Build\/[\w.-]+)?\)/i)?.[1];
  const candidate = hint || (platform === 'android' ? androidModel : null);
  const model = candidate && !/^(K|wv|Android)$/i.test(candidate) ? candidate.slice(0, 80) : null;
  const ip = headers['x-real-ip'];
  const openedAt = new Date().toISOString();

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
  })().catch(error => console.warn('Unable to record hero QR open:', error.message));
}
