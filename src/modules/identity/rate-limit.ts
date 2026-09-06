type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 8;
const MAIL_MAX = 5;
const ACCESS_REQUEST_MAX = 3;
const attempts = new Map<string, Bucket>();

function prune(now: number) {
  if (attempts.size < 200) return;
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }
}

function consume(scope: string, value: string, max: number, windowMs = WINDOW_MS) {
  const now = Date.now();
  prune(now);
  const key = `${scope}:${value.toLowerCase()}`;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }
  if (current.count >= max) {
    return { ok: false as const, retryMinutes: Math.max(1, Math.ceil((current.resetAt - now) / 60_000)) };
  }
  current.count += 1;
  return { ok: true as const };
}

export function consumeLoginAttempt(email: string) {
  return consume("login", email, LOGIN_MAX);
}

export function consumeMailAttempt(email: string) {
  return consume("mail", email, MAIL_MAX);
}

export function consumeAccessRequestAttempt(email: string) {
  return consume("access-request", email, ACCESS_REQUEST_MAX);
}

export function clearLoginAttempts(email: string) {
  attempts.delete(`login:${email.toLowerCase()}`);
}

export function resetRateLimitsForTests() {
  attempts.clear();
}
