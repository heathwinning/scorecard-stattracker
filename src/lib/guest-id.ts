const GUEST_ID_KEY = "sc_guest_id";

/** Returns a persistent guest ID stored in localStorage. Generates one on first call. */
export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = "guest-" + crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** List of scorecard IDs owned by this guest (for My Scores listing). */
const OWNED_KEY = "sc_owned_ids";

export function getOwnedScorecardIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OWNED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addOwnedScorecardId(id: string): void {
  if (typeof window === "undefined") return;
  const ids = getOwnedScorecardIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(OWNED_KEY, JSON.stringify(ids));
  }
}

export function removeOwnedScorecardId(id: string): void {
  if (typeof window === "undefined") return;
  const ids = getOwnedScorecardIds().filter(i => i !== id);
  localStorage.setItem(OWNED_KEY, JSON.stringify(ids));
}
