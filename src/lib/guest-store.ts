// localStorage-backed store for guest users
// Mirrors the server API so pages don't need to change much

import type { Template, TemplateCell, Scorecard, ScorecardPlayer, CellValue } from "./api-client";

const KEYS = {
  templates: "guest_templates",
  scorecards: "guest_scorecards",
  scoreData: (id: string) => `guest_score_${id}`,
};

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function uid(): string {
  return crypto.randomUUID();
}

// ---- Templates ----

export function guestGetTemplates(): Template[] {
  return read<Template>(KEYS.templates);
}

export function guestSaveTemplate(template: {
  name: string;
  description?: string;
  is_public?: boolean;
  cells?: TemplateCell[];
}): Template {
  const tpl: Template = {
    id: `guest-${uid()}`,
    name: template.name,
    description: template.description || "",
    is_public: 0, // Guests can't make public templates
    created_by: "guest",
    creator_name: "Guest",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    cells: (template.cells || []).map((c, i) => ({
      ...c,
      id: c.id || `guest-cell-${uid()}`,
      template_id: "",
      sort_order: c.sort_order ?? i,
    })),
  };

  const all = read<Template>(KEYS.templates);
  all.push(tpl);
  write(KEYS.templates, all);
  return tpl;
}

export function guestUpdateTemplate(id: string, data: {
  name: string;
  description?: string;
  cells?: TemplateCell[];
}): boolean {
  const all = read<Template>(KEYS.templates);
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return false;

  all[idx] = {
    ...all[idx],
    name: data.name,
    description: data.description || all[idx].description,
    cells: (data.cells || all[idx].cells).map((c, i) => ({
      ...c,
      id: c.id || `guest-cell-${uid()}`,
      template_id: id,
      sort_order: c.sort_order ?? i,
    })),
    updated_at: new Date().toISOString(),
  };
  write(KEYS.templates, all);
  return true;
}

export function guestDeleteTemplate(id: string): boolean {
  const all = read<Template>(KEYS.templates);
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length === all.length) return false;
  write(KEYS.templates, filtered);
  return true;
}

export function guestGetTemplate(id: string): Template | null {
  return read<Template>(KEYS.templates).find((t) => t.id === id) || null;
}

// ---- Scorecards ----

export function guestGetScorecards(): Scorecard[] {
  const all = read<Scorecard>(KEYS.scorecards);
  return all.sort((a, b) => new Date(b.game_date || "").getTime() - new Date(a.game_date || "").getTime());
}

export function guestCreateScorecard(data: {
  template_id: string;
  template_name?: string;
  title?: string;
  game_date?: string;
}): Scorecard {
  // Use provided template name, or look up guest template
  let templateName = data.template_name || "";
  if (!templateName && data.template_id.startsWith("guest-")) {
    const tpl = guestGetTemplate(data.template_id);
    if (tpl) templateName = tpl.name;
  }

  const sc: Scorecard = {
    id: `guest-${uid()}`,
    template_id: data.template_id,
    template_name: templateName,
    created_by: "guest",
    title: data.title || "",
    game_date: data.game_date || new Date().toISOString(),
    notes: "",
    share_code: null,
    sharing_mode: "shared",
    host_only_editing: 0,
    is_locked: 0,
    private_player_scores: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const all = read<Scorecard>(KEYS.scorecards);
  all.push(sc);
  write(KEYS.scorecards, all);
  return sc;
}

export function guestGetScorecard(id: string): {
  scorecard: Scorecard;
  players: ScorecardPlayer[];
  values: CellValue[];
} | null {
  const sc = read<Scorecard>(KEYS.scorecards).find((s) => s.id === id);
  if (!sc) return null;

  const data = read<{ players: ScorecardPlayer[]; values: CellValue[] }>(KEYS.scoreData(id));
  return {
    scorecard: sc,
    players: data.length > 0 ? data[0].players : [],
    values: data.length > 0 ? data[0].values : [],
  };
}

export function guestUpdateScorecard(id: string, data: {
  title?: string;
  game_date?: string;
  players?: ScorecardPlayer[];
  values?: CellValue[];
}): boolean {
  const all = read<Scorecard>(KEYS.scorecards);
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return false;

  if (data.title !== undefined) all[idx].title = data.title;
  if (data.game_date !== undefined) all[idx].game_date = data.game_date;
  if ((data as any).share_code !== undefined) all[idx].share_code = (data as any).share_code;
  if ((data as any).sharing_mode !== undefined) (all[idx] as any).sharing_mode = (data as any).sharing_mode;
  if ((data as any).host_only_editing !== undefined) (all[idx] as any).host_only_editing = (data as any).host_only_editing ? 1 : 0;
  if ((data as any).is_locked !== undefined) (all[idx] as any).is_locked = (data as any).is_locked ? 1 : 0;
  if ((data as any).private_player_scores !== undefined) (all[idx] as any).private_player_scores = (data as any).private_player_scores ? 1 : 0;
  all[idx].updated_at = new Date().toISOString();
  write(KEYS.scorecards, all);

  // Save score data
  if (data.players || data.values) {
    const existing = read<{ players: ScorecardPlayer[]; values: CellValue[] }>(KEYS.scoreData(id));
    const current = existing.length > 0 ? existing[0] : { players: [], values: [] };

    if (data.players) current.players = data.players.map((p, i) => ({
      ...p,
      id: p.id || `guest-player-${uid()}`,
      sort_order: i,
    }));

    if (data.values) {
      const valMap = new Map(
        current.values.map((v) => [`${v.template_cell_id}:${v.player_id}:${v.entry_key || ''}`, v])
      );
      for (const v of data.values) {
        const key = `${v.template_cell_id}:${v.player_id}:${v.entry_key || ''}`;
        valMap.set(key, { ...v, id: v.id || `guest-val-${uid()}` });
      }
      current.values = Array.from(valMap.values());
    }

    write(KEYS.scoreData(id), [current]);
  }

  return true;
}

/** Remove a single cell value (e.g. a deleted multi-entry row). */
export function guestDeleteCellValue(id: string, cellId: string, playerId: string | null, entryKey: string): boolean {
  const existing = read<{ players: ScorecardPlayer[]; values: CellValue[] }>(KEYS.scoreData(id));
  if (existing.length === 0) return false;
  const current = existing[0];
  current.values = current.values.filter(
    v => !(v.template_cell_id === cellId && (v.player_id || null) === (playerId || null) && (v.entry_key || "") === entryKey)
  );
  write(KEYS.scoreData(id), [current]);
  return true;
}

export function guestDeleteScorecard(id: string): boolean {
  const all = read<Scorecard>(KEYS.scorecards);
  const filtered = all.filter((s) => s.id !== id);
  write(KEYS.scorecards, filtered);
  localStorage.removeItem(KEYS.scoreData(id));
  return true;
}

export function guestFindByShareCode(code: string): Scorecard | null {
  return read<Scorecard>(KEYS.scorecards).find((s) => s.share_code === code.toUpperCase()) || null;
}

// ---- Migration (guest → logged-in user) ----

export interface GuestData {
  templates: Template[];
  scorecards: Scorecard[];
  scores: Record<string, { players: ScorecardPlayer[]; values: CellValue[] }>;
}

export function getAllGuestData(): GuestData {
  const scorecards = read<Scorecard>(KEYS.scorecards);
  const scores: GuestData["scores"] = {};
  for (const sc of scorecards) {
    const data = read<{ players: ScorecardPlayer[]; values: CellValue[] }>(KEYS.scoreData(sc.id));
    if (data.length > 0) scores[sc.id] = data[0];
  }
  return {
    templates: read<Template>(KEYS.templates),
    scorecards,
    scores,
  };
}

export function clearGuestData() {
  const scorecards = read<Scorecard>(KEYS.scorecards);
  for (const sc of scorecards) {
    localStorage.removeItem(KEYS.scoreData(sc.id));
  }
  localStorage.removeItem(KEYS.templates);
  localStorage.removeItem(KEYS.scorecards);
}

export function hasGuestData(): boolean {
  return (
    read<Template>(KEYS.templates).length > 0 ||
    read<Scorecard>(KEYS.scorecards).length > 0
  );
}
