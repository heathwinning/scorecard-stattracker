// Client-side API helpers — thin wrappers around fetch

const BASE = "";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// Auth
export async function loginWithGoogle(credential: string) {
  return api<{ user: { id: string; email: string; name: string; avatar_url: string | null } }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ credential }) }
  );
}

export async function logout() {
  return api<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return api<{ user: { id: string; email: string; name: string; avatar_url: string | null } | null }>(
    "/api/auth/me"
  );
}

// Templates
export interface TemplateCell {
  id?: string;
  template_id?: string;
  row_pos: number;
  col_pos: number;
  row_span: number;
  col_span: number;
  cell_type: "input:text" | "input:number" | "tally" | "formula" | "heading";
  cell_key: string;
  label: string;
  formula_expr?: string | null;
  per_player: number;
  config_json: Record<string, unknown>;
  sort_order: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  game_id?: string | null;
  game_name?: string | null;
  game_icon?: string | null;
  is_public: number;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  cells: TemplateCell[];
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  category: string;
  player_count: string | null;
  icon: string | null;
}

export async function listTemplates(params?: { public?: boolean; mine?: boolean; game?: string }) {
  const search = new URLSearchParams();
  if (params?.public === false) search.set("public", "false");
  if (params?.mine) search.set("mine", "true");
  if (params?.game) search.set("game", params.game);
  const qs = search.toString();
  return api<{ templates: Template[] }>(`/api/scorecards${qs ? `?${qs}` : ""}`);
}

// Games catalog
export async function listGames() {
  return api<{ games: Game[] }>("/api/games");
}

export async function getTemplate(id: string) {
  return api<{ template: Template }>(`/api/scorecards/${id}`);
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  game_id?: string;
  is_public?: boolean;
  cells?: TemplateCell[];
}) {
  return api<{ template: { id: string } }>("/api/scorecards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id: string, data: {
  name: string;
  description?: string;
  game_id?: string;
  is_public?: boolean;
  cells?: TemplateCell[];
}) {
  return api<{ success: boolean }>(`/api/scorecards/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string) {
  return api<{ success: boolean }>(`/api/scorecards/${id}`, { method: "DELETE" });
}

// Scorecards
export interface ScorecardPlayer {
  id?: string;
  scorecard_id?: string;
  player_name: string;
  sort_order: number;
}

export interface CellValue {
  id?: string;
  scorecard_id?: string;
  template_cell_id: string;
  player_id: string | null;
  entry_key?: string; // '' for normal, '0','1','2' for list entries
  value: string;
  is_hidden?: number;
}

export interface Scorecard {
  id: string;
  template_id: string;
  template_name: string;
  created_by: string;
  title: string;
  game_date: string;
  notes: string;
  share_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScorecardParticipant {
  id: string;
  scorecard_id: string;
  user_id: string;
  player_slot_id: string | null;
  role: "owner" | "player";
  joined_at: string;
  user_name?: string;
}

export async function listScorecards() {
  return api<{ scorecards: Scorecard[] }>("/api/scores");
}

export async function getScorecard(id: string) {
  return api<{
    scorecard: Scorecard;
    players: ScorecardPlayer[];
    values: CellValue[];
  }>(`/api/scores/${id}`);
}

export async function createScorecard(data: {
  template_id: string;
  title?: string;
  game_date?: string;
  notes?: string;
}) {
  return api<{ scorecard: { id: string } }>("/api/scores", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateScorecard(id: string, data: {
  title?: string;
  game_date?: string;
  notes?: string;
  players?: ScorecardPlayer[];
  values?: CellValue[];
}) {
  return api<{ success: boolean }>(`/api/scores/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteScorecard(id: string) {
  return api<{ success: boolean }>(`/api/scores/${id}`, { method: "DELETE" });
}

// Multiplayer: sharing & live sync
export async function shareScorecard(id: string) {
  return api<{ share_code: string }>(`/api/scores/${id}/share`, { method: "POST" });
}

export async function joinScorecard(shareCode: string, playerName?: string) {
  return api<{ scorecard_id: string; player_slot_id: string | null; player_name: string | null }>(
    "/api/scores/join",
    { method: "POST", body: JSON.stringify({ share_code: shareCode, player_name: playerName || undefined }) }
  );
}

export async function getLiveScorecard(id: string, since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return api<{
    scorecard: Scorecard;
    players: ScorecardPlayer[];
    values: CellValue[];
    participants: ScorecardParticipant[];
    last_updated: string;
  }>(`/api/scores/${id}/live${qs}`);
}

export async function updateMyCells(
  scorecardId: string,
  cells: { template_cell_id: string; player_id: string; value: string; entry_key?: string; is_hidden?: number }[]
) {
  return api<{ success: boolean }>(`/api/scores/${scorecardId}/cells`, {
    method: "PUT",
    body: JSON.stringify({ cells }),
  });
}

export async function assignSlot(scorecardId: string, playerSlotId: string, playerName?: string) {
  return api<{ success: boolean; player_name?: string }>(`/api/scores/${scorecardId}/assign`, {
    method: "POST",
    body: JSON.stringify({ player_slot_id: playerSlotId, player_name: playerName || undefined }),
  });
}
