// Client-side rate limiter for login attempts
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes
const STORAGE_KEY = "skpm_login_attempts";

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
}

function getState(): RateLimitState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function setState(state: RateLimitState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function checkLoginRateLimit(): { allowed: boolean; remainingSeconds: number } {
  const state = getState();
  
  if (state.lockedUntil) {
    const remaining = state.lockedUntil - Date.now();
    if (remaining > 0) {
      return { allowed: false, remainingSeconds: Math.ceil(remaining / 1000) };
    }
    // Lockout expired, reset
    setState({ attempts: 0, lockedUntil: null });
  }
  
  return { allowed: true, remainingSeconds: 0 };
}

export function recordLoginAttempt(success: boolean) {
  if (success) {
    setState({ attempts: 0, lockedUntil: null });
    return;
  }
  
  const state = getState();
  const newAttempts = state.attempts + 1;
  
  if (newAttempts >= LOGIN_MAX_ATTEMPTS) {
    setState({ attempts: newAttempts, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS });
  } else {
    setState({ attempts: newAttempts, lockedUntil: null });
  }
}

export function getRemainingAttempts(): number {
  const state = getState();
  return Math.max(0, LOGIN_MAX_ATTEMPTS - state.attempts);
}
