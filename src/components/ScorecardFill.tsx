"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { TemplateCell, ScorecardPlayer, CellValue } from "@/lib/api-client";
import { evaluateFormula, type CellContext } from "@/lib/formula";

interface ScorecardFillProps {
  cells: TemplateCell[];
  players: ScorecardPlayer[];
  values: CellValue[];
  onPlayersChange: (players: ScorecardPlayer[]) => void;
  onValuesChange: (values: CellValue[]) => void;
  readOnly?: boolean;
  // Multiplayer
  myPlayerSlotId?: string | null;
  isOwner?: boolean;
  onCellUpdate?: (cellId: string, playerId: string, value: string, isHidden: number) => void;
}

export default function ScorecardFill({
  cells,
  players,
  values,
  onPlayersChange,
  onValuesChange,
  readOnly = false,
  myPlayerSlotId,
  isOwner = false,
  onCellUpdate,
}: ScorecardFillProps) {
  // Get max grid dimensions
  const maxRow = Math.max(...cells.map((c) => c.row_pos), 0);
  const maxCol = Math.max(...cells.map((c) => c.col_pos), 0);

  // Separate per-player cells from static cells
  const staticCells = cells.filter((c) => !c.per_player);
  const perPlayerCells = cells.filter((c) => c.per_player);

  const isMultiplayer = !!myPlayerSlotId;
  const canEditAny = isOwner || !isMultiplayer;

  // Get value for a cell+player combination
  const getValue = useCallback(
    (cellId: string, playerId: string | null): string => {
      const v = values.find(
        (val) => val.template_cell_id === cellId && val.player_id === (playerId || null)
      );
      return v?.value ?? "";
    },
    [values]
  );

  // Get hidden status
  const isHidden = useCallback(
    (cellId: string, playerId: string | null): boolean => {
      if (!isMultiplayer) return false;
      const v = values.find(
        (val) => val.template_cell_id === cellId && val.player_id === (playerId || null)
      );
      return v?.is_hidden === 1;
    },
    [values, isMultiplayer]
  );

  // Can the current user edit this cell?
  const canEdit = useCallback(
    (playerId: string | null): boolean => {
      if (readOnly) return false;
      if (!isMultiplayer) return true;
      if (canEditAny) return true;
      // Player can only edit their own slot
      return playerId === myPlayerSlotId;
    },
    [readOnly, isMultiplayer, canEditAny, myPlayerSlotId]
  );

  // Set value for a cell+player combination
  const setValue = useCallback(
    (cellId: string, playerId: string | null, value: string, hidden?: number) => {
      if (isMultiplayer && onCellUpdate) {
        onCellUpdate(cellId, playerId || "", value, hidden ?? 0);
        return;
      }
      const existing = values.find(
        (v) => v.template_cell_id === cellId && v.player_id === (playerId || null)
      );
      if (existing) {
        onValuesChange(
          values.map((v) =>
            v.id === existing.id ? { ...v, value } : v
          )
        );
      } else {
        onValuesChange([
          ...values,
          { template_cell_id: cellId, player_id: playerId, value },
        ]);
      }
    },
    [values, onValuesChange, isMultiplayer, onCellUpdate]
  );

  // Tally increment/decrement
  const tallyValue = useCallback(
    (cellId: string, playerId: string | null, delta: number) => {
      const current = parseInt(getValue(cellId, playerId)) || 0;
      const cell = cells.find((c) => c.id === cellId);
      const config = cell?.config_json as Record<string, unknown> | undefined;
      const min = (config?.min as number) ?? 0;
      const step = (config?.step as number) ?? 1;
      const newVal = Math.max(min, current + delta * step);
      setValue(cellId, playerId, String(newVal));
    },
    [cells, getValue, setValue]
  );

  // Compute formula cells with chaining (formulas can reference other formulas)
  const computedFormulas = useMemo(() => {
    const formulaCells = cells.filter((c) => c.cell_type === "formula" && c.formula_expr);
    if (formulaCells.length === 0) return {} as Record<string, number>;

    const formulas: Record<string, number> = {};
    const MAX_PASSES = 10;

    // Helper: build cell contexts including previously computed formulas
    function buildContexts(includeFormulas: Record<string, number>): CellContext[] {
      const ctx: CellContext[] = [];

      // Non-formula per-player cells
      perPlayerCells.filter((c) => c.cell_type !== "formula").forEach((cell) => {
        players.forEach((player) => {
          ctx.push({ key: `${cell.cell_key}_${player.id}`, value: parseFloat(getValue(cell.id!, player.id!)) || 0 });
        });
      });

      // Aggregate keys for SUM() wildcards (sum across all players)
      perPlayerCells.filter((c) => c.cell_type !== "formula").forEach((cell) => {
        const total = players.reduce((sum, p) => sum + (parseFloat(getValue(cell.id!, p.id!)) || 0), 0);
        ctx.push({ key: cell.cell_key, value: total });
      });

      // Include previously computed formula results
      for (const [key, val] of Object.entries(includeFormulas)) {
        // key format: "cellId:playerId" or "cellId"
        // We also register by cell_key for referencing
        const cellId = key.includes(":") ? key.split(":")[0] : key;
        const formulaCell = formulaCells.find((c) => c.id === cellId);
        if (formulaCell) {
          ctx.push({ key: formulaCell.cell_key, value: val });
          if (key.includes(":")) {
            ctx.push({ key: `${formulaCell.cell_key}_${key.split(":")[1]}`, value: val });
          }
        }
      }

      // Non-formula static cells
      staticCells.filter((c) => c.cell_type !== "formula").forEach((cell) => {
        const val = parseFloat(getValue(cell.id!, null)) || 0;
        ctx.push({ key: cell.cell_key, value: val });
      });

      return ctx;
    }

    // Iterative evaluation: each pass may pick up results from previous pass
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;

      formulaCells.forEach((cell) => {
        if (cell.per_player) {
          players.forEach((player) => {
            const key = `${cell.id}:${player.id}`;
            const cellContexts = buildContexts(formulas);
            const result = evaluateFormula(cell.formula_expr!, cellContexts);
            if (formulas[key] !== result) {
              formulas[key] = result;
              changed = true;
            }
          });
        } else {
          const key = cell.id!;
          const cellContexts = buildContexts(formulas);
          const result = evaluateFormula(cell.formula_expr!, cellContexts);
          if (formulas[key] !== result) {
            formulas[key] = result;
            changed = true;
          }
        }
      });

      if (!changed) break;
    }

    return formulas;
  }, [cells, players, perPlayerCells, staticCells, getValue]);

  const addPlayer = () => {
    onPlayersChange([
      ...players,
      { player_name: `Player ${players.length + 1}`, sort_order: players.length },
    ]);
  };

  const removePlayer = (index: number) => {
    onPlayersChange(players.filter((_, i) => i !== index));
  };

  const updatePlayerName = (index: number, name: string) => {
    onPlayersChange(
      players.map((p, i) => (i === index ? { ...p, player_name: name } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Player management */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Players</h3>
          {!readOnly && (
            <button onClick={addPlayer} className="btn-secondary text-xs py-1.5 px-3">
              + Add Player
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player, i) => (
            <div key={player.id || i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {readOnly ? (
                <span className="text-sm font-semibold text-slate-900">{player.player_name}</span>
              ) : (
                <input type="text" value={player.player_name} onChange={(e) => updatePlayerName(i, e.target.value)}
                  className="bg-transparent text-sm font-semibold w-24 outline-none text-slate-900 placeholder:text-slate-400"
                  placeholder="Name" />
              )}
              {!readOnly && players.length > 1 && (
                <button onClick={() => removePlayer(i)} className="text-slate-400 hover:text-rose-500 text-sm ml-0.5 transition-colors">×</button>
              )}
            </div>
          ))}
          {players.length === 0 && (
            <span className="text-sm text-slate-400">{readOnly ? "No players" : "Add players to get started"}</span>
          )}
        </div>
      </div>

      {/* The Scorecard Grid */}
      <div className="card p-4 overflow-x-auto">
        <div
          className="grid gap-1 min-w-[600px]"
          style={{
            gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`,
          }}
        >
          {/* Static cells */}
          {staticCells.map((cell) => (
            <div
              key={cell.id || cell.cell_key}
              style={{
                gridRow: `${cell.row_pos + 1} / span ${cell.row_span}`,
                gridColumn: `${cell.col_pos + 1} / span ${cell.col_span}`,
              }}
              className="p-2"
            >
              <StaticCellRenderer
                cell={cell}
                value={getValue(cell.id!, null)}
                formulaResult={computedFormulas[cell.id!]}
                onChange={(v) => setValue(cell.id!, null, v)}
                readOnly={!canEdit(null)}
                isHidden={isHidden(cell.id!, null)}
              />
            </div>
          ))}

          {/* Per-player cells: repeat for each player */}
          {players.map((player, playerIdx) => {
            // Offset per-player rows after static rows
            const playerRowOffset = maxRow + 1 + playerIdx * (Math.max(...perPlayerCells.map(c => c.row_pos), 0) + 1);

            return perPlayerCells.map((cell) => (
              <div
                key={`${cell.id || cell.cell_key}-${player.id || playerIdx}`}
                style={{
                  gridRow: `${playerRowOffset + cell.row_pos + 1} / span ${cell.row_span}`,
                  gridColumn: `${cell.col_pos + 1} / span ${cell.col_span}`,
                }}
                className="p-1"
              >
                <StaticCellRenderer
                  cell={cell}
                  value={getValue(cell.id!, player.id!)}
                  formulaResult={computedFormulas[`${cell.id}:${player.id}`]}
                  onChange={(v) => setValue(cell.id!, player.id!, v)}
                  onTally={(delta) => tallyValue(cell.id!, player.id!, delta)}
                  readOnly={!canEdit(player.id!)}
                  isHidden={isHidden(cell.id!, player.id!)}
                  onReveal={canEdit(player.id!) && isHidden(cell.id!, player.id!) ? () => setValue(cell.id!, player.id!, getValue(cell.id!, player.id!), 0) : undefined}
                />
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Cell Renderer ----

function StaticCellRenderer({
  cell,
  value,
  formulaResult,
  onChange,
  onTally,
  readOnly,
  isHidden,
  onReveal,
}: {
  cell: TemplateCell;
  value: string;
  formulaResult?: number;
  onChange: (v: string) => void;
  onTally?: (delta: number) => void;
  readOnly: boolean;
  isHidden?: boolean;
  onReveal?: () => void;
}) {
  // Hidden cells show a lock
  if (isHidden) {
    if (onReveal) {
      return (
        <button onClick={onReveal}
          className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-slate-100 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs text-slate-400 hover:text-indigo-600">
          🔒 Tap to reveal
        </button>
      );
    }
    return (
      <div className="flex items-center h-10 px-3">
        <span className="text-sm text-slate-300">🔒 Hidden</span>
      </div>
    );
  }
  switch (cell.cell_type) {
    case "heading":
      return (
        <h3 className="text-base font-bold text-indigo-800 py-1.5">{cell.label || "Heading"}</h3>
      );
    case "label":
      return (
        <span className="text-sm font-semibold text-slate-500 py-1.5 block">{cell.label || cell.cell_key}</span>
      );
    case "input:text":
      return readOnly ? (
        <span className="text-sm font-medium text-slate-900 py-1.5 block">{value || "—"}</span>
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="input-field text-sm h-10" placeholder={(cell.config_json as Record<string, unknown>)?.placeholder as string || ""} />
      );
    case "input:number":
      return readOnly ? (
        <span className="text-lg font-bold font-mono text-slate-900 py-1.5 block">{value || "—"}</span>
      ) : (
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
          className="input-field text-sm h-10 font-mono text-center" placeholder="0" />
      );
    case "tally":
      return readOnly ? (
        <span className="text-lg font-bold font-mono text-slate-900 py-1.5 block">{value || "0"}</span>
      ) : (
        <div className="flex items-center gap-2 h-10">
          <button onClick={() => onTally?.(-1)} className="tally-btn-minus">−</button>
          <span className="text-lg font-bold font-mono w-10 text-center select-none text-slate-900">{value || "0"}</span>
          <button onClick={() => onTally?.(1)} className="tally-btn-plus">+</button>
        </div>
      );
    case "formula":
      const result = formulaResult ?? 0;
      return (
        <div className="flex items-center h-10">
          <span className="text-lg font-bold font-mono text-amber-700 bg-amber-50 px-3 py-1 rounded-lg">{result}</span>
        </div>
      );

    default:
      return null;
  }
}
