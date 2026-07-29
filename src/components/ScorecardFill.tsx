"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useReactTable, getCoreRowModel, createColumnHelper, flexRender,
} from "@tanstack/react-table";
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
  cells, players, values, onPlayersChange, onValuesChange,
  readOnly = false, myPlayerSlotId, isOwner = false, onCellUpdate,
}: ScorecardFillProps) {
  const isMultiplayer = !!myPlayerSlotId;
  const canEditAny = isOwner || !isMultiplayer;
  const [myViewOnly, setMyViewOnly] = useState(false);

  const sortedCells = useMemo(() => [...cells].sort((a, b) => a.sort_order - b.sort_order), [cells]);

  const getValue = useCallback((cellId: string, playerId: string | null): string => {
    const v = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null));
    return v?.value ?? "";
  }, [values]);

  const isHidden = useCallback((cellId: string, playerId: string | null): boolean => {
    if (!isMultiplayer) return false;
    const v = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null));
    return v?.is_hidden === 1;
  }, [values, isMultiplayer]);

  const canEdit = useCallback((playerId: string | null): boolean => {
    if (readOnly) return false;
    if (!isMultiplayer) return true;
    if (canEditAny) return true;
    return playerId === myPlayerSlotId;
  }, [readOnly, isMultiplayer, canEditAny, myPlayerSlotId]);

  const setValue = useCallback((cellId: string, playerId: string | null, value: string, hidden?: number) => {
    if (isMultiplayer && onCellUpdate) { onCellUpdate(cellId, playerId || "", value, hidden ?? 0); return; }
    const existing = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null));
    if (existing) {
      onValuesChange(values.map(v => v.id === existing.id ? { ...v, value } : v));
    } else {
      onValuesChange([...values, { template_cell_id: cellId, player_id: playerId, value }]);
    }
  }, [values, onValuesChange, isMultiplayer, onCellUpdate]);

  const tallyValue = useCallback((cellId: string, playerId: string | null, delta: number) => {
    const current = parseInt(getValue(cellId, playerId)) || 0;
    const cell = cells.find(c => c.id === cellId);
    const config = cell?.config_json as Record<string, unknown> | undefined;
    const min = (config?.min as number) ?? 0;
    const step = (config?.step as number) ?? 1;
    setValue(cellId, playerId, String(Math.max(min, current + delta * step)));
  }, [cells, getValue, setValue]);

  // ---- Formula computation (unchanged from original) ----
  const computedFormulas = useMemo(() => {
    const formulaCells = cells.filter(c => c.cell_type === "formula" && c.formula_expr);
    if (formulaCells.length === 0) return {} as Record<string, number>;
    const results: Record<string, number> = {};
    const perPlayerCells = cells.filter(c => c.per_player);
    const staticCells = cells.filter(c => !c.per_player);
    function buildContexts(inc: Record<string, number>): CellContext[] {
      const ctx: CellContext[] = [];
      perPlayerCells.filter(c => c.cell_type !== "formula").forEach(cell => {
        players.forEach(p => { ctx.push({ key: `${cell.cell_key}_${p.id}`, value: parseFloat(getValue(cell.id!, p.id!)) || 0 }); });
        ctx.push({ key: cell.cell_key, value: players.reduce((s, p) => s + (parseFloat(getValue(cell.id!, p.id!)) || 0), 0) });
      });
      for (const [k, v] of Object.entries(inc)) {
        const cid = k.includes(":") ? k.split(":")[0] : k;
        const fc = formulaCells.find(f => f.id === cid);
        if (fc) { ctx.push({ key: fc.cell_key, value: v }); if (k.includes(":")) ctx.push({ key: `${fc.cell_key}_${k.split(":")[1]}`, value: v }); }
      }
      staticCells.filter(c => c.cell_type !== "formula").forEach(cell => { ctx.push({ key: cell.cell_key, value: parseFloat(getValue(cell.id!, null)) || 0 }); });
      return ctx;
    }
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      formulaCells.forEach(cell => {
        if (cell.per_player) {
          players.forEach(p => { const k = `${cell.id}:${p.id}`; const r = evaluateFormula(cell.formula_expr!, buildContexts(results)); if (results[k] !== r) { results[k] = r; changed = true; } });
        } else {
          const k = cell.id!; const r = evaluateFormula(cell.formula_expr!, buildContexts(results)); if (results[k] !== r) { results[k] = r; changed = true; }
        }
      });
      if (!changed) break;
    }
    return results;
  }, [cells, players, getValue]);

  // ---- Player management ----
  const addPlayer = () => { onPlayersChange([...players, { player_name: `Player ${players.length + 1}`, sort_order: players.length }]); };
  const removePlayer = (index: number) => { onPlayersChange(players.filter((_, i) => i !== index)); };
  const updatePlayerName = (index: number, name: string) => { onPlayersChange(players.map((p, i) => i === index ? { ...p, player_name: name } : p)); };

  // ---- TanStack Table setup ----
  const columnHelper = createColumnHelper<TemplateCell>();

  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: "category",
        header: "Category",
        cell: ({ row }) => {
          const cell = row.original;
          const isH = cell.cell_type === "heading";
          if (isH) return <span className="font-bold text-sm text-indigo-800">{cell.label || cell.cell_key}</span>;
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-slate-700 truncate">{cell.label || cell.cell_key}</span>
              {cell.formula_expr && <code className="text-[10px] bg-amber-100 text-amber-600 px-1 py-0 rounded shrink-0 hidden sm:inline">={cell.formula_expr}</code>}
            </div>
          );
        },
        size: 140,
        minSize: 100,
        enableHiding: false,
      }),
    ];

    // Player columns
    const visiblePlayers = myViewOnly && myPlayerSlotId
      ? players.filter(p => p.id === myPlayerSlotId)
      : players;

    visiblePlayers.forEach((player, pi) => {
      cols.push(columnHelper.display({
        id: player.id || `p${pi}`,
        header: player.player_name,
        cell: ({ row }) => {
          const cell = row.original;
          if (cell.cell_type === "heading") return null;
          const val = getValue(cell.id!, player.id!);
          const hidden = isHidden(cell.id!, player.id!);
          const edit = canEdit(player.id!);
          return (
            <CellInput
              cell={cell}
              value={val}
              formulaResult={cell.cell_type === "formula" ? computedFormulas?.[`${cell.id}:${player.id}`] : undefined}
              onChange={(v) => setValue(cell.id!, player.id!, v)}
              onTally={(d) => tallyValue(cell.id!, player.id!, d)}
              readOnly={!edit}
              isHidden={hidden}
              onReveal={edit && hidden ? () => setValue(cell.id!, player.id!, getValue(cell.id!, player.id!), 0) : undefined}
            />
          );
        },
        size: 100,
        minSize: 75,
        enableHiding: false,
      }));
    });

    return cols;
  }, [columnHelper, players, myViewOnly, myPlayerSlotId, getValue, isHidden, canEdit, setValue, tallyValue, computedFormulas]);

  const table = useReactTable({
    data: sortedCells,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Player management */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Players</h3>
          {!readOnly && (
            <button onClick={addPlayer} className="btn-secondary text-xs py-1.5 px-3">+ Add Player</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player, i) => (
            <div key={player.id || i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {readOnly ? (
                <span className="text-sm font-semibold text-slate-900">{player.player_name}</span>
              ) : (
                <input type="text" value={player.player_name} onChange={(e) => updatePlayerName(i, e.target.value)}
                  className="bg-transparent text-sm font-semibold w-24 outline-none text-slate-900 placeholder:text-slate-400" placeholder="Name" />
              )}
              {!readOnly && players.length > 1 && (
                <button onClick={() => removePlayer(i)} className="text-slate-400 hover:text-rose-500 text-sm ml-0.5 transition-colors">×</button>
              )}
            </div>
          ))}
          {players.length === 0 && <span className="text-sm text-slate-400">{readOnly ? "No players" : "Add players to get started"}</span>}
        </div>
      </div>

      {/* Scorecard table */}
      <div className="card overflow-x-auto">
        {/* View toggle */}
        {isMultiplayer && players.length > 1 && (
          <div className="px-3 sm:px-4 pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:justify-between">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setMyViewOnly(false)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${!myViewOnly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Full Scorecard
              </button>
              <button onClick={() => setMyViewOnly(true)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${myViewOnly ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                My Scores
              </button>
            </div>
            {myViewOnly && (
              <span className="text-xs text-indigo-500 font-medium">
                Only {players.find(p => p.id === myPlayerSlotId)?.player_name || "your"} scores
              </span>
            )}
          </div>
        )}
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b-2 border-slate-200">
                {hg.headers.map(header => (
                  <th key={header.id}
                    className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 sm:px-3 py-2.5 text-left first:pl-3 last:text-center"
                    style={{ width: header.getSize(), minWidth: header.column.columnDef.minSize }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, ri) => {
              const cell = row.original;
              const isHeading = cell.cell_type === "heading";
              if (isHeading) {
                return (
                  <tr key={row.id} className={`border-b border-slate-100 ${ri % 2 === 0 ? "bg-indigo-50/30" : ""}`}>
                    <td colSpan={row.getVisibleCells().length} className="px-4 py-2.5 font-bold text-sm text-indigo-800">
                      {cell.label || cell.cell_key}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${ri % 2 === 0 ? "bg-slate-50/30" : ""}`}>
                  {row.getVisibleCells().map(vcell => (
                    <td key={vcell.id} className="px-2 sm:px-3 py-2 first:pl-3 last:text-center">
                      {flexRender(vcell.column.columnDef.cell, vcell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Cell Input (unchanged) ----

function CellInput({ cell, value, formulaResult, onChange, onTally, readOnly, isHidden, onReveal }: {
  cell: TemplateCell; value: string; formulaResult?: number; onChange: (v: string) => void;
  onTally?: (delta: number) => void; readOnly: boolean; isHidden?: boolean; onReveal?: () => void;
}) {
  if (isHidden) {
    if (onReveal) return (
      <button onClick={onReveal} className="flex items-center gap-1 h-9 px-2.5 rounded-lg bg-slate-100 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs text-slate-400 hover:text-indigo-600">
        🔒 Reveal
      </button>
    );
    return <span className="text-sm text-slate-300">🔒</span>;
  }
  switch (cell.cell_type) {
    case "input:text":
      return readOnly
        ? <span className="text-sm font-medium text-slate-900 block py-1">{value || "—"}</span>
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className="input-field text-sm h-9 w-full" placeholder="—" />;
    case "input:number":
      return readOnly
        ? <span className="text-base font-bold font-mono text-slate-900 block py-1">{value || "—"}</span>
        : <input type="number" value={value} onChange={e => onChange(e.target.value)} className="input-field text-sm h-9 w-full font-mono text-center" placeholder="0" />;
    case "tally":
      return readOnly
        ? <span className="text-base font-bold font-mono text-slate-900 block py-1">{value || "0"}</span>
        : (
          <div className="flex items-center justify-center gap-1 h-9">
            <button onClick={() => onTally?.(-1)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 font-bold text-sm transition-colors">−</button>
            <span className="text-base font-bold font-mono w-10 text-center select-none text-slate-900">{value || "0"}</span>
            <button onClick={() => onTally?.(1)} className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 font-bold text-sm transition-colors">+</button>
          </div>
        );
    case "formula":
      return <span className="text-base font-bold font-mono text-amber-700 bg-amber-50 px-3 py-1 rounded-lg inline-block">{formulaResult ?? "—"}</span>;
    default: return null;
  }
}
