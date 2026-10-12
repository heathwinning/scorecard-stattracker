export interface PlayerPickSettingOption {
  value: string;
  label: string;
}

export interface PlayerPickSettingField {
  key: string;
  label: string;
  options: PlayerPickSettingOption[];
}

export interface PlayerPickMode {
  id: string;
  label: string;
  description: string;
  settingFields: PlayerPickSettingField[];
  defaultSettings: Record<string, string>;
}

export interface FirstPlayerPreferences {
  modeId: string;
  settings: Record<string, Record<string, string>>;
}

export const PLAYER_PICK_MODES: PlayerPickMode[] = [
  {
    id: "fingers",
    label: "Finger tap",
    description: "Everyone touches the screen, then one finger is chosen at random.",
    settingFields: [
      {
        key: "autoStartSeconds",
        label: "Pick automatically once fingers stop changing",
        options: [
          { value: "0", label: "Manual" },
          { value: "2", label: "After 2 seconds" },
          { value: "3", label: "After 3 seconds" },
          { value: "5", label: "After 5 seconds" },
        ],
      },
    ],
    defaultSettings: { autoStartSeconds: "0" },
  },
  {
    id: "name-shuffle",
    label: "Name shuffle",
    description: "Animates through the scorecard's player names and lands on one.",
    settingFields: [
      {
        key: "durationSeconds",
        label: "Animation length",
        options: [
          { value: "1.5", label: "Quick" },
          { value: "3", label: "Medium" },
          { value: "5", label: "Long" },
        ],
      },
    ],
    defaultSettings: { durationSeconds: "3" },
  },
];

export const DEFAULT_PLAYER_PICK_MODE_ID = PLAYER_PICK_MODES[0].id;

const STORAGE_KEY = "scorecard.firstPlayer";

export function getPlayerPickMode(modeId: string): PlayerPickMode {
  return PLAYER_PICK_MODES.find((mode) => mode.id === modeId) ?? PLAYER_PICK_MODES[0];
}

export function getModeSettings(preferences: FirstPlayerPreferences, modeId: string): Record<string, string> {
  const mode = getPlayerPickMode(modeId);
  return { ...mode.defaultSettings, ...preferences.settings[mode.id] };
}

export function loadFirstPlayerPreferences(): FirstPlayerPreferences {
  const fallback: FirstPlayerPreferences = { modeId: DEFAULT_PLAYER_PICK_MODE_ID, settings: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      modeId: typeof parsed.modeId === "string" ? parsed.modeId : fallback.modeId,
      settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {},
    };
  } catch {
    return fallback;
  }
}

export function saveFirstPlayerPreferences(preferences: FirstPlayerPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable (private mode); preferences then last for the session only.
  }
}

export function pickRandomIndex(count: number): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % count;
}
