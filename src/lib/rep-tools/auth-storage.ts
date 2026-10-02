export type RepToolsSession = {
  fullName: string;
  email: string;
  createdAt: string;
};

const SESSION_KEY = "realty-edge-tools:open-access-session:v1";

export function getRepToolsSession(): RepToolsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as RepToolsSession) : null;
  } catch {
    return null;
  }
}

export function createOpenAccessSession(fullName: string, email: string) {
  const session: RepToolsSession = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearRepToolsSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

export const repToolsAccessMode = "open" as const;
