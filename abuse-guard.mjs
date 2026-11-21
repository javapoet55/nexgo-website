import {isIP} from 'node:net';

// Railway's edge sets X-Real-IP itself. X-Forwarded-For is a list the caller can start with any
// value, so it must never decide who a visitor is.
const trustedHeader = (process.env.TRUSTED_IP_HEADER || 'x-real-ip').toLowerCase();

/** The visitor's address from the trusted header, or null when it is missing or not an IP. */
export function clientAddress(req) {
  const raw = String(req.headers[trustedHeader] || '').trim();
  const kind = isIP(raw);
  if (!kind) return null;
  if (kind === 4) return raw;
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return mapped;
  // One home or phone connection owns a whole IPv6 /64, so count it as one visitor.
  const [left, right] = new URL(`http://[${raw}]/`).hostname.slice(1, -1).split('::');
  const head = left ? left.split(':') : [];
  const tail = right ? right.split(':') : [];
  const groups = right === undefined ? head : [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail];
  return groups.slice(0, 4).join(':') + '::/64';
}

/** Counts events per key in fixed windows. take() is true while the key is within its limit. */
export function createLimiter({limit, windowMs, maxKeys = 50_000}) {
  const entries = new Map();
  const entry = (key, now) => {
    let found = entries.get(key);
    if (found && found.resetAt > now) return found;
    if (!found && entries.size >= maxKeys) {
      for (const [k, v] of entries) if (v.resetAt <= now) entries.delete(k);
      // Still full of live keys: drop the oldest so memory stays bounded during a flood.
      for (const k of entries.keys()) { if (entries.size < maxKeys) break; entries.delete(k); }
    }
    found = {count: 0, resetAt: now + windowMs};
    entries.delete(key);
    entries.set(key, found);
    return found;
  };
  return {
    take(key, now = Date.now()) {
      const found = entry(key, now);
      if (found.count >= limit) return false;
      found.count++;
      return true;
    },
    remaining(key, now = Date.now()) {
      const found = entries.get(key);
      return !found || found.resetAt <= now ? limit : Math.max(0, limit - found.count);
    },
    get size() { return entries.size; },
  };
}

/** A whole number from the environment, or the fallback when unset or invalid. */
export function setting(name, fallback) {
  const raw = process.env[name];
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isInteger(value) && value >= 0 ? value : fallback;
}
