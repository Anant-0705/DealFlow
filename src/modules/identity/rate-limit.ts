type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, Bucket>();

function prune(now: number) {
  if (attempts.size < 200) return;
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }
}

export function consumeLoginAttempt(email: string) {
  const now = Date.now();
  prune(now);
  const key = email.toLowerCase();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }
  if (current.count >= MAX_ATTEMPTS) {
    return { ok: false as const, retryMinutes: Math.max(1, Math.ceil((current.resetAt - now) / 60_000)) };
  }
  current.count += 1;
  return { ok: true as const };
}

export function clearLoginAttempts(email: string) {
  attempts.delete(email.toLowerCase());
}
