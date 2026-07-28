"use client";

import { useState, useMemo, useCallback } from "react";
import type { TemplateCell, ScorecardPlayer, CellValue } from "@/lib/api-client";
import { evaluateFormula, type CellContext } from "@/lib/formula";

interface ScorecardFillProps {
  cells: TemplateCell[];
  players: ScorecardPlayer[];
  values: CellValue[];
  onPlayersChange: (players: ScorecardPlayer[]) => void;
  onValuesChange: (values: CellValue[]) => void;
  readOnly?: boolean;
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
  const isMultiplayer = !!myPlayerSlotId;
  const canEditAny = isOwner || !isMultiplayer;

  // Sort cells by sort_order
  const sortedCells = useMemo(
    () => [...cells].sort((a, b) => a.sort_order - b.sort_order),
    [cells]
  );

  const getValue = useCallback(
    (cellId: string, playerId: string | null): string => {
      const v = values.find(
        (val) => val.template_cell_id === cellId && val.player_id === (playerId || null)
      );
      return v?.value ?? "";
    },
    [values]
  );

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

  const canEdit = useCallback(
    (playerId: string | null): boolean => {
      if (readOnly) return false;
      if (!isMultiplayer) return true;
      if (canEditAny) return true;
      return playerId === myPlayerSlotId;
    },
    [readOnly, isMultiplayer, canEditAny, myPlayerSlotId]
  );

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

  // Formula computation
  const computedFormulas = useMemo(() => {
    const formulaCells = cells.filter((c) => c.cell_type === "formula" && c.formula_expr);
    if (formulaCells.length === 0) return {} as Record<string, number>;

    const results: Record<string, number> = {};
    const MAX_PASSES = 10;
    const perPlayerCells = cells.filter((c) => c.per_player);
    const staticCells = cells.filter((c) => !c.per_player);

    function buildContexts(includeFormulas: Record<string, number>): CellContext[] {
      const ctx: CellContext[] = [];

      perPlayerCells.filter((c) => c.cell_type !== "formula").forEach((cell) => {
        players.forEach((player) => {
          ctx.push({ key: `${cell.cell_key}_${player.id}`, value: parseFloat(getValue(cell.id!, player.id!)) || 0 });
        });
        const total = players.reduce((sum, p) => sum + (parseFloat(getValue(cell.id!, p.id!)) || 0), 0);
        ctx.push({ key: cell.cell_key, value: total });
      });

      for (const [key, val] of Object.entries(includeFormulas)) {
        const cellId = key.includes(":") ? key.split(":")[0] : key;
        const formulaCell = formulaCells.find((c) => c.id === cellId);
        if (formulaCell) {
          ctx.push({ key: formulaCell.cell_key, value: val });
          if (key.includes(":")) {
            ctx.push({ key: `${formulaCell.cell_key}_${key.split(":")[1]}`, value: val });
          }
        }
      }

      staticCells.filter((c) => c.cell_type !== "formula").forEach((cell) => {
        ctx.push({ key: cell.cell_key, value: parseFloat(getValue(cell.id!, null)) || 0 });
      });

      return ctx;
    }

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      formulaCells.forEach((cell) => {
        if (cell.per_player) {
          players.forEach((player) => {
            const key = `${cell.id}:${player.id}`;
            const r = evaluateFormula(cell.formula_expr!, buildContexts(results));
            if (results[key] !== r) { results[key] = r; changed = true; }
          });
        } else {
          const key = cell.id!;
          const r = evaluateFormula(cell.formula_expr!, buildContexts(results));
          if (results[key] !== r) { results[key] = r; changed = true; }
        }
      });
      if (!changed) break;
    }
    return results;
  }, [cells, players, getValue]);

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
    onPlayersChange(players.map((p, i) => (i === index ? { ...p, player_name: name } : p)));
  };

  const hasPlayers = players.length > 0;

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

      {/* Table-based Scorecard */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[400px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 text-left w-[200px]">
                Category
              </th>
              {hasPlayers ? players.map((player, i) => (
                <th key={player.id || i} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 text-center min-w-[100px]">
                  {player.player_name}
                </th>
              )) : (
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3 text-center">
                  Value
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedCells.map((cell, idx) => (
              <ScoreRow
                key={cell.id || cell.cell_key}
                cell={cell}
                players={players}
                hasPlayers={hasPlayers}
                getValue={getValue}
                formulaResult={cell.cell_type === "formula" ? computedFormulas : undefined}
                setValue={setValue}
                tallyValue={tallyValue}
                canEdit={canEdit}
                isHidden={isHidden}
                isEven={idx % 2 === 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Score Row Component ----

function ScoreRow({
  cell,
  players,
  hasPlayers,
  getValue,
  formulaResult,
  setValue,
  tallyValue,
  canEdit,
  isHidden,
  isEven,
}: {
  cell: TemplateCell;
  players: ScorecardPlayer[];
  hasPlayers: boolean;
  getValue: (cellId: string, playerId: string | null) => string;
  formulaResult?: Record<string, number>;
  setValue: (cellId: string, playerId: string | null, value: string, hidden?: number) => void;
  tallyValue: (cellId: string, playerId: string | null, delta: number) => void;
  canEdit: (playerId: string | null) => boolean;
  isHidden: (cellId: string, playerId: string | null) => boolean;
  isEven: boolean;
}) {
  const isHeading = cell.cell_type === "heading";
  const colSpan = hasPlayers ? players.length : 1;

  if (isHeading) {
    return (
      <tr className={`border-b border-slate-100 ${isEven ? "bg-indigo-50/30" : ""}`}>
        <td colSpan={colSpan + 1} className="px-4 py-2.5 font-bold text-sm text-indigo-800">
          {cell.label || cell.cell_key}
        </td>
      </tr>
    );
  }

  const editCell = canEdit(null);

  if (!cell.per_player) {
    // Static cell: one value for all
    const val = getValue(cell.id!, null);
    const hidden = isHidden(cell.id!, null);
    return (
      <tr className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isEven ? "bg-slate-50/30" : ""}`}>
        <td className="px-4 py-2.5">
          <span className="text-sm font-medium text-slate-700">{cell.label || cell.cell_key}</span>
          {cell.cell_type === "formula" && cell.formula_expr && (
            <code className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded ml-2 align-middle">={cell.formula_expr}</code>
          )}
        </td>
        <td colSpan={colSpan} className="px-3 py-2.5">
          <CellInput
            cell={cell}
            value={val}
            formulaResult={formulaResult?.[cell.id!]}
            onChange={(v) => setValue(cell.id!, null, v)}
            onTally={(d) => tallyValue(cell.id!, null, d)}
            readOnly={!editCell}
            isHidden={hidden}
            onReveal={editCell && hidden ? () => setValue(cell.id!, null, getValue(cell.id!, null), 0) : undefined}
          />
        </td>
      </tr>
    );
  }

  // Per-player cell: one column per player
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isEven ? "bg-slate-50/30" : ""}`}>
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium text-slate-700">{cell.label || cell.cell_key}</span>
        {cell.cell_type === "formula" && cell.formula_expr && (
          <code className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded ml-2 align-middle">={cell.formula_expr}</code>
        )}
      </td>
      {players.map((player) => {
        const val = getValue(cell.id!, player.id!);
        const hidden = isHidden(cell.id!, player.id!);
        const edit = canEdit(player.id!);
        return (
          <td key={player.id || player.player_name} className="px-3 py-2.5">
            <CellInput
              cell={cell}
              value={val}
              formulaResult={formulaResult?.[`${cell.id}:${player.id}`]}
              onChange={(v) => setValue(cell.id!, player.id!, v)}
              onTally={(d) => tallyValue(cell.id!, player.id!, d)}
              readOnly={!edit}
              isHidden={hidden}
              onReveal={edit && hidden ? () => setValue(cell.id!, player.id!, getValue(cell.id!, player.id!), 0) : undefined}
            />
          </td>
        );
      })}
      {!hasPlayers && (
        <td className="px-3 py-2.5">
          <span className="text-xs text-slate-300">+ players</span>
        </td>
      )}
    </tr>
  );
}

// ---- Cell Input ----

function CellInput({
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
  if (isHidden) {
    if (onReveal) {
      return (
        <button onClick={onReveal}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs text-slate-400 hover:text-indigo-600">
          🔒 Reveal
        </button>
      );
    }
    return <span className="text-sm text-slate-300">🔒 Hidden</span>;
  }

  switch (cell.cell_type) {
    case "heading":
      return <span className="text-sm font-bold text-indigo-800">{cell.label}</span>;

    case "input:text":
      return readOnly ? (
        <span className="text-sm font-medium text-slate-900 block py-1">{value || "—"}</span>
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="input-field text-sm h-9 w-full" placeholder="—" />
      );

    case "input:number":
      return readOnly ? (
        <span className="text-base font-bold font-mono text-slate-900 block py-1">{value || "—"}</span>
      ) : (
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
          className="input-field text-sm h-9 w-full font-mono text-center" placeholder="0" />
      );

    case "tally":
      return readOnly ? (
        <span className="text-base font-bold font-mono text-slate-900 block py-1">{value || "0"}</span>
      ) : (
        <div className="flex items-center justify-center gap-1.5 h-9">
          <button onClick={() => onTally?.(-1)}
            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 font-bold text-sm transition-colors">−</button>
          <span className="text-base font-bold font-mono w-10 text-center select-none text-slate-900">{value || "0"}</span>
          <button onClick={() => onTally?.(1)}
            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 font-bold text-sm transition-colors">+</button>
        </div>
      );

    case "formula":
      return (
        <span className="text-base font-bold font-mono text-amber-700 bg-amber-50 px-3 py-1 rounded-lg inline-block">
          {formulaResult ?? "—"}
        </span>
      );

    default:
      return null;
  }
}
