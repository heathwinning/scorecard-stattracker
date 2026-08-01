// Shared scorecard formula computation.
// Used by the unified ScorecardGrid so solo, shared, and live modes all
// evaluate formulas identically.

import type { TemplateCell, ScorecardPlayer, CellValue } from "@/lib/api-client";
import { evaluateFormula, type CellContext } from "@/lib/formula";

const num = (v?: string) => {
  const n = parseFloat(v || "");
  return Number.isFinite(n) ? n : 0;
};

/**
 * Compute all formula/heading-formula results for a scorecard.
 *
 * Result keys:
 * - per-player formulas: `${cellId}:${playerId}`
 * - static formulas:     `${cellId}`
 *
 * Context keys available inside formula expressions:
 * - `cell_key`           — for the current player (per-player evaluation)
 * - `player(cell_key, 1)`— a specific player's value (one-based column index)
 * - `players(cell_key)` — the total for that field across every player
 */
export function computeFormulaResults(
  cells: TemplateCell[],
  players: ScorecardPlayer[],
  values: CellValue[]
): Record<string, number> {
  const formulaCells = cells.filter(
    c => (c.cell_type === "formula" || c.cell_type === "heading") && c.formula_expr
  );
  if (!formulaCells.length) return {};

  const entriesFor = (cellId: string, playerId: string | null) =>
    values
      .filter(v => v.template_cell_id === cellId && (v.player_id || null) === playerId)
      .sort((a, b) => (a.entry_key || "").localeCompare(b.entry_key || ""));

  const inputCells = cells.filter(c => c.cell_type !== "formula" && c.cell_type !== "heading");
  const perPlayerInputs = inputCells.filter(c => c.per_player);
  const staticInputs = inputCells.filter(c => !c.per_player);
  const hasMultipleEntries = (cell: TemplateCell) => {
    const config = cell.config_json as Record<string, unknown>;
    return !!config.allow_multiple || typeof config.repeatable_group === "string";
  };

  const results: Record<string, number> = {};

  // Iterate to a fixed point so formulas can reference other formulas.
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;

    // Base context shared by every evaluation this pass.
    const base: CellContext[] = [];
    perPlayerInputs.forEach(cell => {
      const multipleEntries = hasMultipleEntries(cell);
      players.forEach((p, playerIndex) => {
        const entries = entriesFor(cell.id!, p.id!);
        const items = multipleEntries ? entries.map(entry => num(entry.value)) : [num(entries[0]?.value)];
        const value = items.reduce((sum, item) => sum + item, 0);
        base.push({ key: `player_${playerIndex + 1}_${cell.cell_key}`, value, items, aggregate: false });
      });
    });
    staticInputs.forEach(cell =>
      base.push({ key: cell.cell_key, value: num(entriesFor(cell.id!, null)[0]?.value) })
    );
    // Previously-computed formula results under qualified keys.
    formulaCells.forEach(fc => {
      if (fc.per_player) {
        players.forEach((p, playerIndex) => {
          const r = results[`${fc.id}:${p.id}`];
          if (r !== undefined) base.push({ key: `player_${playerIndex + 1}_${fc.cell_key}`, value: r, aggregate: false });
        });
      } else if (results[fc.id!] !== undefined) {
        base.push({ key: fc.cell_key, value: results[fc.id!], aggregate: false });
      }
    });

    formulaCells.forEach(fc => {
      if (fc.per_player) {
        players.forEach(p => {
          // Player helper values remain available through player(field, index)
          // and players(field), but never participate in a current player's
          // aggregate. This keeps list totals strictly player-local.
          const ctx: CellContext[] = base.map(entry => ({ ...entry, aggregate: false }));
          // Unqualified keys resolve to the current player's values.
          perPlayerInputs.forEach(cell => {
            const multipleEntries = hasMultipleEntries(cell);
            const entries = entriesFor(cell.id!, p.id!);
            if (multipleEntries) {
              entries.forEach(e =>
                ctx.push({ key: `${cell.cell_key}_${e.entry_key || "0"}`, value: num(e.value) })
              );
              ctx.push({ key: cell.cell_key, value: entries.reduce((s, e) => s + num(e.value), 0) });
            } else {
              ctx.push({ key: cell.cell_key, value: num(entries[0]?.value) });
            }
          });
          // Other per-player formulas, resolved for this player.
          formulaCells.forEach(other => {
            if (!other.per_player || other.id === fc.id) return;
            const r = results[`${other.id}:${p.id}`];
            if (r !== undefined) ctx.push({ key: other.cell_key, value: r, aggregate: false });
          });
          const r = evaluateFormula(fc.formula_expr!, ctx);
          const key = `${fc.id}:${p.id}`;
          if (results[key] !== r) { results[key] = r; changed = true; }
        });
      } else {
        const r = evaluateFormula(fc.formula_expr!, base);
        if (results[fc.id!] !== r) { results[fc.id!] = r; changed = true; }
      }
    });

    if (!changed) break;
  }
  return results;
}
