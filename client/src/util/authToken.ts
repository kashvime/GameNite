const KEY = "token";

/**
 * Prefer sessionStorage so each browser tab can keep its own login (localStorage is shared).
 * Falls back to localStorage for older sessions, then copies into sessionStorage for this tab.
 */
export function getStoredAuthToken(): string {
  const fromSession = sessionStorage.getItem(KEY);
  if (fromSession) return fromSession;
  const fromLocal = localStorage.getItem(KEY);
  if (fromLocal) {
    sessionStorage.setItem(KEY, fromLocal);
    return fromLocal;
  }
  return "";
}

/** Persist login for this tab only (does not overwrite other tabs' sessions). */
export function setStoredAuthToken(token: string): void {
  sessionStorage.setItem(KEY, token);
}

export function clearStoredAuthToken(): void {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}
