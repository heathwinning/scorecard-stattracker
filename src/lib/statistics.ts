import type { CellValue, Scorecard, ScorecardPlayer, TemplateCell } from "./api-client";
import { computeFormulaResults } from "./scorecard-formulas";

export interface StatisticsHistory {
  scorecards: StatisticsScorecard[];
  players: (ScorecardPlayer & { scorecard_id: string })[];
  values: (CellValue & { scorecard_id: string })[];
  templateCells: Record<string, TemplateCell[]>;
}

type StatisticsScorecard = Pick<Scorecard, "id" | "title" | "template_id" | "template_name" | "game_date"> & {
  cells?: TemplateCell[];
};

export type Outcome = "win" | "loss" | "tie";

interface PlayerResult {
  key: string;
  name: string;
  score: number;
  outcome?: Outcome;
}

export interface ScoredGame {
  id: string;
  title: string;
  date: string;
  templateId: string;
  templateName: string;
  players: PlayerResult[];
}

const totalKeys = new Set(["total_score", "total_points", "total_vp", "grand_total", "player_total", "game_total"]);
const specialScoreKeys = new Map([["spades", "round_score"], ["poker", "net"]]);
const lowScoreGames = new Set(["uno", "phase10", "golf", "rummy", "liverpool-rummy"]);
const winningTargets = new Map([["cribbage", 121], ["catan", 10], ["euchre", 10]]);

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function isNumericInput(cell: TemplateCell) {
  return cell.cell_type === "input:number" || cell.cell_type === "input:list" || cell.cell_type === "tally";
}

function scoreField(cells: TemplateCell[], templateId: string) {
  const fields = cells.filter(cell => cell.per_player && cell.id && (
    isNumericInput(cell) || cell.formula_expr || cell.config_json?.repeatable_running_total
  ));
  const formulas = fields.filter(cell => cell.formula_expr || cell.config_json?.repeatable_running_total);
  return fields.find(cell => cell.cell_key === specialScoreKeys.get(templateId))
    ?? fields.find(cell => totalKeys.has(cell.cell_key))
    ?? fields.find(cell => /^(?:(?:grand|final) )?(?:total(?: (?:score|points|victory points))?|(?:final )?score|points)$/i.test(cell.label.trim()))
    ?? (formulas.length === 1 ? formulas[0] : undefined)
    ?? (fields.length === 1 ? fields[0] : undefined);
}

function scoringInputs(field: TemplateCell, cells: TemplateCell[], visited = new Set<string>()): string[] {
  if (visited.has(field.cell_key)) return [];
  visited.add(field.cell_key);
  if (!field.formula_expr) {
    if (!field.config_json?.repeatable_running_total) return [field.id!];
    return cells.filter(cell => cell.id && isNumericInput(cell)
      && cell.config_json?.repeatable_group === field.config_json.repeatable_group).map(cell => cell.id!);
  }
  const referencedKeys = new Set((field.formula_expr.match(/[a-z_][a-z_0-9]*/gi) ?? [])
    .map(key => key.replace(/^player_\d+_/, "")));
  return cells.filter(cell => cell.id && referencedKeys.has(cell.cell_key))
    .flatMap(cell => scoringInputs(cell, cells, visited));
}

function numeric(value: CellValue) {
  return value.value.trim() !== "" && Number.isFinite(Number(value.value));
}

function scoreGame(card: StatisticsScorecard, players: ScorecardPlayer[], values: CellValue[], defaults: TemplateCell[]): ScoredGame | undefined {
  let cells = card.cells?.length ? card.cells : defaults.filter(cell => cell.sort_order >= 0);
  // These templates switched from fixed rows to repeatable entries.
  if (!card.cells?.length && (card.template_id === "scrabble" || card.template_id === "cribbage")) {
    const oldCells = defaults.filter(cell => cell.sort_order < 0);
    const oldIds = new Set(oldCells.map(cell => cell.id));
    const currentIds = new Set(cells.map(cell => cell.id));
    if (values.some(value => oldIds.has(value.template_cell_id) && numeric(value))
      && !values.some(value => currentIds.has(value.template_cell_id) && numeric(value))) cells = oldCells;
  }
  const field = scoreField(cells, card.template_id);
  if (!field || !players.length) return;

  const inputIds = new Set(scoringInputs(field, cells));
  const valuesByPlayer = groupBy(values.filter(value => value.player_id && numeric(value)), value => value.player_id!);
  const formulaResults = field.formula_expr ? computeFormulaResults(cells, players, values) : {};
  const nameCounts = new Map<string, number>();
  const results: PlayerResult[] = [];
  for (const player of players) {
    const name = player.player_name.trim().replace(/\s+/g, " ") || `Player ${player.sort_order + 1}`;
    const nameKey = name.toLowerCase();
    const occurrence = (nameCounts.get(nameKey) ?? 0) + 1;
    nameCounts.set(nameKey, occurrence);
    const entries = (valuesByPlayer.get(player.id!) ?? []).filter(value => inputIds.has(value.template_cell_id));
    if (!entries.length) continue;
    const score = field.formula_expr
      ? formulaResults[`${field.id}:${player.id}`]
      : entries.reduce((sum, entry) => sum + Number(entry.value), 0);
    if (Number.isFinite(score)) results.push({
      key: JSON.stringify([nameKey, occurrence]),
      name: occurrence === 1 ? name : `${name} (${occurrence})`,
      score,
    });
  }
  if (!results.length) return;

  if (results.length > 1 && results.length === players.length && card.template_id !== "poker") {
    const best = results.reduce((best, player) => lowScoreGames.has(card.template_id)
      ? Math.min(best, player.score) : Math.max(best, player.score), results[0].score);
    if (best >= (winningTargets.get(card.template_id) ?? -Infinity)) {
      const tied = results.filter(player => player.score === best).length > 1;
      for (const player of results) player.outcome = player.score === best ? (tied ? "tie" : "win") : "loss";
    }
  }
  return {
    id: card.id,
    title: card.title,
    templateId: card.template_id,
    templateName: card.template_name || "Game",
    date: card.game_date,
    players: results,
  };
}

export function buildStatistics(history: StatisticsHistory): ScoredGame[] {
  const players = groupBy(history.players, player => player.scorecard_id);
  const values = groupBy(history.values, value => value.scorecard_id);
  return history.scorecards.flatMap(card => {
    const game = scoreGame(card, players.get(card.id) ?? [], values.get(card.id) ?? [], history.templateCells[card.template_id] ?? []);
    return game ? [game] : [];
  }).sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
}

export function summarizeScores(players: PlayerResult[]) {
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const { score } of players) {
    total += score;
    min = Math.min(min, score);
    max = Math.max(max, score);
  }
  return players.length ? { average: total / players.length, min, max } : undefined;
}

export function summarizePlayers(games: ScoredGame[]) {
  const players = groupBy(games.flatMap(game => game.players), player => player.key);
  return Array.from(players, ([key, entries]) => {
    const outcomes = { win: 0, loss: 0, tie: 0 };
    for (const player of entries) {
      if (player.outcome) outcomes[player.outcome]++;
    }
    const decided = outcomes.win + outcomes.loss + outcomes.tie;
    return {
      key, name: entries[entries.length - 1].name, games: entries.length, outcomes,
      winRate: decided ? outcomes.win / decided : undefined,
      scores: summarizeScores(entries)!,
    };
  }).sort((a, b) => b.outcomes.win - a.outcomes.win || b.games - a.games || a.name.localeCompare(b.name));
}
