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
 * - `cell_key`           — for the current player (per-player evaluation) or the
 *                          sum across all players (static evaluation)
 * - `cell_key_<playerId>`— a specific player's value
 * - `cell_key_<entryKey>`— individual entries of allow_multiple cells (current player)
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

  const results: Record<string, number> = {};

  // Iterate to a fixed point so formulas can reference other formulas.
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;

    // Base context shared by every evaluation this pass.
    const base: CellContext[] = [];
    perPlayerInputs.forEach(cell => {
      const allowMultiple = !!(cell.config_json as Record<string, unknown>)?.allow_multiple;
      let total = 0;
      players.forEach(p => {
        const entries = entriesFor(cell.id!, p.id!);
        const sum = entries.reduce((s, e) => s + num(e.value), 0);
        total += sum;
        base.push({ key: `${cell.cell_key}_${p.id}`, value: allowMultiple ? sum : num(entries[0]?.value) });
      });
      base.push({ key: cell.cell_key, value: total });
    });
    staticInputs.forEach(cell =>
      base.push({ key: cell.cell_key, value: num(entriesFor(cell.id!, null)[0]?.value) })
    );
    // Previously-computed formula results under qualified keys.
    formulaCells.forEach(fc => {
      if (fc.per_player) {
        players.forEach(p => {
          const r = results[`${fc.id}:${p.id}`];
          if (r !== undefined) base.push({ key: `${fc.cell_key}_${p.id}`, value: r });
        });
      } else if (results[fc.id!] !== undefined) {
        base.push({ key: fc.cell_key, value: results[fc.id!] });
      }
    });

    formulaCells.forEach(fc => {
      if (fc.per_player) {
        players.forEach(p => {
          const ctx = [...base];
          // Unqualified keys resolve to the current player's values.
          perPlayerInputs.forEach(cell => {
            const allowMultiple = !!(cell.config_json as Record<string, unknown>)?.allow_multiple;
            const entries = entriesFor(cell.id!, p.id!);
            if (allowMultiple) {
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
            if (r !== undefined) ctx.push({ key: other.cell_key, value: r });
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
