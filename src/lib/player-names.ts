export const MAX_PLAYER_NAME_LENGTH = 80;
export const MAX_GROUP_SOURCES = 100;

export interface PlayerNameGroup {
  id: string;
  name: string;
  sources: string[];
}

export function cleanPlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parsePlayerSource(key: string) {
  if (key.length > 512) return undefined;
  try {
    const parts: unknown = JSON.parse(key);
    if (!Array.isArray(parts)) return undefined;
    if (parts[0] === "account" && parts.length === 2 && typeof parts[1] === "string" && parts[1]) {
      return { type: "account" as const, value: parts[1] };
    }
    if (parts[0] === "name" && parts.length === 3 && typeof parts[1] === "string" && parts[1]
      && Number.isSafeInteger(parts[2]) && parts[2] > 0) {
      return { type: "name" as const, value: parts[1], occurrence: parts[2] as number };
    }
  } catch { /* invalid source key */ }
  return undefined;
}
