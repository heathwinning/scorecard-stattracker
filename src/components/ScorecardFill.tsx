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
  onPlayersChange: (p: ScorecardPlayer[]) => void;
  onValuesChange: (v: CellValue[]) => void;
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

  const getValue = useCallback((cellId: string, playerId: string | null): string =>
    values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null))?.value ?? "",
  [values]);

  const isHidden = useCallback((cellId: string, playerId: string | null): boolean => {
    if (!isMultiplayer) return false;
    return values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null))?.is_hidden === 1;
  }, [values, isMultiplayer]);

  const canEdit = useCallback((playerId: string | null): boolean => {
    if (readOnly) return false;
    if (!isMultiplayer) return true;
    return canEditAny || playerId === myPlayerSlotId;
  }, [readOnly, isMultiplayer, canEditAny, myPlayerSlotId]);

  const setValue = useCallback((cellId: string, playerId: string | null, value: string, hidden?: number) => {
    if (isMultiplayer && onCellUpdate) { onCellUpdate(cellId, playerId || "", value, hidden ?? 0); return; }
    const ex = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null));
    if (ex) onValuesChange(values.map(v => v.id === ex.id ? { ...v, value } : v));
    else onValuesChange([...values, { template_cell_id: cellId, player_id: playerId, value }]);
  }, [values, onValuesChange, isMultiplayer, onCellUpdate]);

  const tallyValue = useCallback((cellId: string, playerId: string | null, delta: number) => {
    const cur = parseInt(getValue(cellId, playerId)) || 0;
    const config = cells.find(c => c.id === cellId)?.config_json as Record<string, unknown> | undefined;
    const min = (config?.min as number) ?? 0;
    const step = (config?.step as number) ?? 1;
    setValue(cellId, playerId, String(Math.max(min, cur + delta * step)));
  }, [cells, getValue, setValue]);

  // Formula computation (unchanged core logic)
  const computedFormulas = useMemo(() => {
    const formulaCells = cells.filter(c => c.cell_type === "formula" && c.formula_expr);
    if (!formulaCells.length) return {} as Record<string, number>;
    const results: Record<string, number> = {};
    const pp = cells.filter(c => c.per_player);
    const st = cells.filter(c => !c.per_player);
    function ctx(inc: Record<string, number>): CellContext[] {
      const c: CellContext[] = [];
      pp.filter(x => x.cell_type !== "formula").forEach(cell => {
        players.forEach(p => c.push({ key: `${cell.cell_key}_${p.id}`, value: parseFloat(getValue(cell.id!, p.id!)) || 0 }));
        c.push({ key: cell.cell_key, value: players.reduce((s, p) => s + (parseFloat(getValue(cell.id!, p.id!)) || 0), 0) });
      });
      for (const [k, v] of Object.entries(inc)) {
        const cid = k.includes(":") ? k.split(":")[0] : k;
        const fc = formulaCells.find(f => f.id === cid);
        if (fc) { c.push({ key: fc.cell_key, value: v }); if (k.includes(":")) c.push({ key: `${fc.cell_key}_${k.split(":")[1]}`, value: v }); }
      }
      st.filter(x => x.cell_type !== "formula").forEach(cell => c.push({ key: cell.cell_key, value: parseFloat(getValue(cell.id!, null)) || 0 }));
      return c;
    }
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      formulaCells.forEach(cell => {
        if (cell.per_player) {
          players.forEach(p => { const k = `${cell.id}:${p.id}`; const r = evaluateFormula(cell.formula_expr!, ctx(results)); if (results[k] !== r) { results[k] = r; changed = true; } });
        } else {
          const k = cell.id!; const r = evaluateFormula(cell.formula_expr!, ctx(results)); if (results[k] !== r) { results[k] = r; changed = true; }
        }
      });
      if (!changed) break;
    }
    return results;
  }, [cells, players, getValue]);

  // Player management
  const addPlayer = () => onPlayersChange([...players, { player_name: `P${players.length + 1}`, sort_order: players.length }]);
  const removePlayer = (i: number) => onPlayersChange(players.filter((_, idx) => idx !== i));
  const updatePlayerName = (i: number, n: string) => onPlayersChange(players.map((p, idx) => idx === i ? { ...p, player_name: n } : p));

  // TanStack Table columns — auto-width
  const columnHelper = createColumnHelper<TemplateCell>();
  const columns = useMemo(() => {
    const cols = [columnHelper.display({
      id: "category",
      header: "",
      cell: ({ row }) => {
        const c = row.original;
        if (c.cell_type === "heading") return <span className="font-semibold text-[13px] text-indigo-700">{c.label || c.cell_key}</span>;
        const tooltip = c.formula_expr ? `=${c.formula_expr}` : c.cell_type;
        return (
          <span className="text-[13px] font-medium text-slate-700 truncate block max-w-[160px]" title={tooltip}>
            {c.label || c.cell_key}
          </span>
        );
      },
    })];
    const visiblePlayers = myViewOnly && myPlayerSlotId ? players.filter(p => p.id === myPlayerSlotId) : players;
    visiblePlayers.forEach((player) => {
      cols.push(columnHelper.display({
        id: player.id || "",
        header: player.player_name,
        cell: ({ row }) => {
          const c = row.original;
          if (c.cell_type === "heading") return null;
          const val = getValue(c.id!, player.id!);
          const hidden = isHidden(c.id!, player.id!);
          const edit = canEdit(player.id!);
          return <CellInput cell={c} value={val}
            formulaResult={c.cell_type === "formula" ? computedFormulas?.[`${c.id}:${player.id}`] : undefined}
            onChange={v => setValue(c.id!, player.id!, v)}
            onTally={d => tallyValue(c.id!, player.id!, d)}
            readOnly={!edit} isHidden={hidden}
            onReveal={edit && hidden ? () => setValue(c.id!, player.id!, getValue(c.id!, player.id!), 0) : undefined} />;
        },
      }));
    });
    return cols;
  }, [columnHelper, players, myViewOnly, myPlayerSlotId, getValue, isHidden, canEdit, setValue, tallyValue, computedFormulas]);

  const table = useReactTable({ data: sortedCells, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-3">
      {/* Top bar: Players + Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {players.map((player, i) => (
          <div key={player.id || i} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1">
            {readOnly ? (
              <span className="text-xs font-semibold text-slate-700">{player.player_name}</span>
            ) : (
              <input type="text" value={player.player_name} onChange={e => updatePlayerName(i, e.target.value)}
                className="bg-transparent text-xs font-semibold w-16 outline-none text-slate-900 placeholder:text-slate-400" placeholder="Name" />
            )}
            {!readOnly && players.length > 1 && (
              <button onClick={() => removePlayer(i)} className="text-slate-400 hover:text-rose-500 text-xs leading-none">×</button>
            )}
          </div>
        ))}
        {!readOnly && <button onClick={addPlayer} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-1">+ Player</button>}
        {players.length === 0 && <span className="text-xs text-slate-400">{readOnly ? "No players" : "Add players"}</span>}
        {isMultiplayer && players.length > 1 && (
          <div className="ml-auto flex items-center bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setMyViewOnly(false)}
              className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${!myViewOnly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>All</button>
            <button onClick={() => setMyViewOnly(true)}
              className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${myViewOnly ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Mine</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse table-auto">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-slate-200">
                {hg.headers.map(h => (
                  <th key={h.id} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 text-left first:pl-3 last:text-center">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, ri) => {
              const c = row.original;
              if (c.cell_type === "heading") {
                return (
                  <tr key={row.id} className="border-b border-slate-100 bg-indigo-50/40">
                    <td colSpan={row.getVisibleCells().length} className="px-3 py-1.5">{flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}</td>
                  </tr>
                );
              }
              return (
                <tr key={row.id} className={`border-b border-slate-100 ${ri % 2 === 0 ? "bg-slate-50/40" : ""}`}>
                  {row.getVisibleCells().map(vc => (
                    <td key={vc.id} className="px-2 py-1 first:pl-3 last:text-center">
                      {flexRender(vc.column.columnDef.cell, vc.getContext())}
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

// Cell Input — compact
function CellInput({ cell, value, formulaResult, onChange, onTally, readOnly, isHidden, onReveal }: {
  cell: TemplateCell; value: string; formulaResult?: number; onChange: (v: string) => void;
  onTally?: (d: number) => void; readOnly: boolean; isHidden?: boolean; onReveal?: () => void;
}) {
  if (isHidden) {
    if (onReveal) return <button onClick={onReveal} className="text-[11px] text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">🔒</button>;
    return <span className="text-xs text-slate-300">🔒</span>;
  }
  switch (cell.cell_type) {
    case "input:text":
      return readOnly
        ? <span className="text-[13px] text-slate-900">{value || "—"}</span>
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full text-[13px] px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white" placeholder="—" />;
    case "input:number":
      return readOnly
        ? <span className="text-[13px] font-mono font-semibold text-slate-900">{value || "—"}</span>
        : <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-16 text-[13px] font-mono text-center px-1 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white" placeholder="0" />;
    case "tally":
      return readOnly
        ? <span className="text-[13px] font-mono font-semibold text-slate-900">{value || "0"}</span>
        : (
          <div className="inline-flex items-center gap-0.5">
            <button onClick={() => onTally?.(-1)} className="w-6 h-6 rounded bg-rose-50 text-rose-500 hover:bg-rose-100 text-xs font-bold">−</button>
            <span className="text-[13px] font-mono font-semibold w-8 text-center tabular-nums">{value || "0"}</span>
            <button onClick={() => onTally?.(1)} className="w-6 h-6 rounded bg-emerald-50 text-emerald-500 hover:bg-emerald-100 text-xs font-bold">+</button>
          </div>
        );
    case "formula":
      return <span className="text-[13px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{formulaResult ?? "—"}</span>;
    default: return null;
  }
}
