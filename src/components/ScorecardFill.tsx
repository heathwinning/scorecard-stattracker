"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from "@tanstack/react-table";
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
  onCellUpdate?: (cellId: string, playerId: string, value: string, isHidden: number, entryKey?: string) => void;
}

export default function ScorecardFill({
  cells, players, values, onPlayersChange, onValuesChange,
  readOnly = false, myPlayerSlotId, isOwner = false, onCellUpdate,
}: ScorecardFillProps) {
  const isMultiplayer = !!myPlayerSlotId;
  const canEditAny = isOwner || !isMultiplayer;
  const [myViewOnly, setMyViewOnly] = useState(false);

  const sortedCells = useMemo(() =>
    [...cells]
      .filter(c => (c.cell_type as string) !== "label" && c.sort_order >= 0)
      .sort((a, b) => a.sort_order - b.sort_order),
  [cells]);
  const initialized = useRef(false);

  // Auto-add one entry for allow_multiple cells when scorecard first loads
  useEffect(() => {
    if (initialized.current || readOnly || players.length === 0) return;
    initialized.current = true;
    const newValues = [...values];
    let changed = false;
    cells.filter(c => !!(c.config_json as Record<string, unknown>)?.allow_multiple).forEach(cell => {
      players.forEach(player => {
        const existing = values.filter(v => v.template_cell_id === cell.id && v.player_id === player.id);
        if (existing.length === 0) {
          newValues.push({ template_cell_id: cell.id!, player_id: player.id!, entry_key: '0', value: '' });
          changed = true;
        }
      });
    });
    if (changed) onValuesChange(newValues);
  }, [cells, players, values, readOnly, onValuesChange]);

  const getEntryValues = useCallback((cellId: string, playerId: string | null): CellValue[] =>
    values.filter(v => v.template_cell_id === cellId && v.player_id === (playerId || null)).sort((a, b) => (a.entry_key || '').localeCompare(b.entry_key || '')),
  [values]);

  const getValue = useCallback((cellId: string, playerId: string | null, entryKey?: string): string => {
    const ek = entryKey ?? '';
    const v = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null) && (v.entry_key || '') === ek);
    return v?.value ?? "";
  }, [values]);

  const isHidden = useCallback((cellId: string, playerId: string | null, entryKey?: string): boolean => {
    if (!isMultiplayer) return false;
    const ek = entryKey ?? '';
    return values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null) && (v.entry_key || '') === ek)?.is_hidden === 1;
  }, [values, isMultiplayer]);

  const canEdit = useCallback((playerId: string | null): boolean => {
    if (readOnly) return false;
    if (!isMultiplayer) return true;
    return canEditAny || playerId === myPlayerSlotId;
  }, [readOnly, isMultiplayer, canEditAny, myPlayerSlotId]);

  const setValue = useCallback((cellId: string, playerId: string | null, value: string, entryKey?: string, hidden?: number) => {
    const ek = entryKey ?? '';
    if (isMultiplayer && onCellUpdate) { onCellUpdate(cellId, playerId || "", value, hidden ?? 0, entryKey); return; }
    const ex = values.find(v => v.template_cell_id === cellId && v.player_id === (playerId || null) && (v.entry_key || '') === ek);
    if (ex) onValuesChange(values.map(v => v === ex ? { ...v, value } : v));
    else onValuesChange([...values, { template_cell_id: cellId, player_id: playerId, entry_key: ek, value }]);
  }, [values, onValuesChange, isMultiplayer, onCellUpdate]);

  const addEntry = useCallback((cellId: string, playerId: string | null) => {
    const entries = getEntryValues(cellId, playerId);
    onValuesChange([...values, { template_cell_id: cellId, player_id: playerId, entry_key: String(entries.length), value: '' }]);
  }, [values, onValuesChange, getEntryValues]);

  const removeEntry = useCallback((cellId: string, playerId: string | null, entryKey: string) => {
    onValuesChange(values.filter(v => !(v.template_cell_id === cellId && v.player_id === (playerId || null) && (v.entry_key || '') === entryKey)));
  }, [values, onValuesChange]);

  const tallyValue = useCallback((cellId: string, playerId: string | null, delta: number, entryKey?: string) => {
    const cur = parseInt(getValue(cellId, playerId, entryKey)) || 0;
    const cell = cells.find(c => c.id === cellId);
    const config = cell?.config_json as Record<string, unknown> | undefined;
    const min = (config?.min as number) ?? 0;
    const step = (config?.step as number) ?? 1;
    setValue(cellId, playerId, String(Math.max(min, cur + delta * step)), entryKey);
  }, [cells, getValue, setValue]);

  const computedFormulas = useMemo(() => {
    const formulaCells = cells.filter(c => (c.cell_type === "formula" || c.cell_type === "heading") && c.formula_expr);
    if (!formulaCells.length) return {} as Record<string, number>;
    const results: Record<string, number> = {};
    const pp = cells.filter(c => c.per_player);
    const st = cells.filter(c => !c.per_player);
    function ctx(inc: Record<string, number>): CellContext[] {
      const c: CellContext[] = [];
      pp.filter(x => x.cell_type !== "formula").forEach(cell => {
        const allowMultiple = !!(cell.config_json as Record<string, unknown>)?.allow_multiple;
        players.forEach(p => {
          const entries = values.filter(v => v.template_cell_id === cell.id && v.player_id === p.id);
          if (allowMultiple && entries.length > 0) {
            entries.forEach(e => c.push({ key: `${cell.cell_key}_${e.entry_key || '0'}`, value: parseFloat(e.value) || 0 }));
            c.push({ key: `${cell.cell_key}_${p.id}`, value: entries.reduce((s, e) => s + (parseFloat(e.value) || 0), 0) });
          } else {
            const v = entries.length > 0 ? parseFloat(entries[0].value) || 0 : 0;
            c.push({ key: `${cell.cell_key}_${p.id}`, value: v });
          }
        });
        c.push({ key: cell.cell_key, value: players.reduce((s, p) => s + (values.filter(v => v.template_cell_id === cell.id && v.player_id === p.id)).reduce((ss, e) => ss + (parseFloat(e.value) || 0), 0), 0) });
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
  }, [cells, players, values, getValue]);

  const addPlayer = () => onPlayersChange([...players, { id: `new-${crypto.randomUUID().slice(0, 8)}`, player_name: `P${players.length + 1}`, sort_order: players.length }]);
  const removePlayer = (i: number) => onPlayersChange(players.filter((_, idx) => idx !== i));
  const updatePlayerName = (i: number, n: string) => onPlayersChange(players.map((p, idx) => idx === i ? { ...p, player_name: n } : p));

  // Preview columns when no players exist (layout preview mode)
  const displayPlayers = useMemo(() => {
    if (players.length > 0) {
      return myViewOnly && myPlayerSlotId ? players.filter(p => p.id === myPlayerSlotId) : players;
    }
    // Preview mode: show P1 and P2
    return [
      { id: "preview-1", player_name: "P1", sort_order: 0 },
      { id: "preview-2", player_name: "P2", sort_order: 1 },
    ];
  }, [players, myViewOnly, myPlayerSlotId]);

  const columnHelper = createColumnHelper<TemplateCell>();
  const columns = useMemo(() => {
    const cols = [columnHelper.display({
      id: "category",
      header: "",
      cell: ({ row }) => {
        const c = row.original;
        const isTotal = /total/i.test(c.label || c.cell_key);
        const isSection = !!(c.config_json as Record<string, unknown>)?.section;
        if (c.cell_type === "heading") return <span className="font-semibold text-[13px] text-indigo-700">{c.label || c.cell_key}</span>;
        const tooltip = [c.label || c.cell_key.replace(/_/g, ' ')];
        if (c.formula_expr) tooltip.push(`Formula: ${c.formula_expr}`);
        if (!!(c.config_json as Record<string, unknown>)?.allow_multiple) tooltip.push('Players can add multiple entries');
        const isChild = !!(c.config_json as Record<string, unknown>)?.child;
        return <span className={`text-[13px] ${isTotal ? "font-bold" : isSection ? "font-semibold text-indigo-700" : "font-medium"} text-slate-700 ${isChild ? "pl-4" : ""}`} title={tooltip.join('\n')}>{c.label || c.cell_key.replace(/_/g, ' ')}</span>;
      },
    })];
    displayPlayers.forEach((player, pi) => {
      const isPreview = (player.id || '').startsWith("preview-");
      cols.push(columnHelper.display({
        id: player.id || `p${pi}`,
        header: () => isPreview ? (
          <span className="text-[11px] font-semibold text-slate-400">{player.player_name}</span>
        ) : readOnly ? (
          <span className="text-xs font-semibold text-slate-700">{player.player_name}</span>
        ) : (
          <div className="flex items-center gap-1 justify-center">
            <input type="text" value={player.player_name}
              onChange={e => updatePlayerName(players.findIndex(p => p.id === player.id), e.target.value)}
              className="bg-transparent text-xs font-semibold w-16 outline-none text-slate-900 text-center placeholder:text-slate-400" placeholder="Name" />
            {players.length > 1 && (
              <button onClick={() => removePlayer(players.findIndex(p => p.id === player.id))} className="text-slate-400 hover:text-rose-500 text-[10px] leading-none">×</button>
            )}
          </div>
        ),
        cell: ({ row }) => {
          const c = row.original;
          if (c.cell_type === "heading") return null;
          if (isPreview) {
            const allowMultiple = !!(c.config_json as Record<string, unknown>)?.allow_multiple;
            if (allowMultiple) return <span className="text-[11px] text-slate-300">…</span>;
            if (c.cell_type === "input:text") return <span className="text-[11px] text-slate-300">abc</span>;
            return <span className="text-[11px] text-slate-300">0</span>;
          }
          const edit = canEdit(player.id!);
          const allowMultiple = !!(c.config_json as Record<string, unknown>)?.allow_multiple;
          if (allowMultiple) {
            const entries = getEntryValues(c.id!, player.id!);
            return (
              <div className="space-y-0.5 py-0.5">
                {entries.map(e => {
                  const ek = e.entry_key || '0';
                  return (
                    <div key={ek} className="flex items-center gap-0.5 justify-center">
                      <input type="text" value={e.value || ''}
                        onChange={ev => setValue(c.id!, player.id!, ev.target.value, ek)}
                        className="w-12 text-[12px] font-mono text-center px-1 py-0.5 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white"
                        placeholder="0" disabled={!edit} />
                      {!readOnly && entries.length > 1 && (
                        <button onClick={() => removeEntry(c.id!, player.id!, ek)}
                          className="text-[10px] text-slate-400 hover:text-rose-500">×</button>
                      )}
                    </div>
                  );
                })}
                {!readOnly && <button onClick={() => addEntry(c.id!, player.id!)} className="text-[10px] text-indigo-500 hover:text-indigo-700">+ entry</button>}
              </div>
            );
          }
          const val = getValue(c.id!, player.id!);
          const hidden = isHidden(c.id!, player.id!);
          return <CellInput cell={c} value={val}
            formulaResult={c.cell_type === "formula" ? computedFormulas?.[`${c.id}:${player.id}`] : undefined}
            onChange={v => setValue(c.id!, player.id!, v)} onTally={d => tallyValue(c.id!, player.id!, d)}
            readOnly={!edit} isHidden={hidden}
            onReveal={edit && hidden ? () => setValue(c.id!, player.id!, getValue(c.id!, player.id!)) : undefined} />;
        },
      }));
    });
    return cols;
  }, [columnHelper, displayPlayers, players, readOnly, myViewOnly, myPlayerSlotId, getValue, isHidden, canEdit, setValue, tallyValue, computedFormulas, getEntryValues, addEntry, removeEntry, updatePlayerName, removePlayer]);

  const table = useReactTable({ data: sortedCells, columns, getCoreRowModel: getCoreRowModel() });
  const isPreviewMode = players.length === 0;

  return (
    <div className="space-y-3">
      {/* Add player button (only when not readOnly and not preview) */}
      {!readOnly && !isPreviewMode && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addPlayer} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">+ Add Player</button>
          {isMultiplayer && players.length > 1 && (
            <div className="ml-auto flex items-center bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setMyViewOnly(false)}
                className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${!myViewOnly ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>All</button>
              <button onClick={() => setMyViewOnly(true)}
                className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${myViewOnly ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>Mine</button>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse table-auto">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-slate-200">
                {hg.headers.map(h => (
                  <th key={h.id} className={`text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5 ${h.column.id === "category" ? "text-left whitespace-nowrap" : "text-center w-0"}`}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, ri) => {
              const c = row.original;
              const isTotal = /total/i.test(c.label || c.cell_key);
              const isSection = !!(c.config_json as Record<string, unknown>)?.section;
              if (c.cell_type === "heading") {
                const hasFormula = !!c.formula_expr;
                return (
                  <tr key={row.id} className="border-b border-slate-100 bg-indigo-50/40">
                    <td className="px-2 py-1">
                      <span className="font-semibold text-[13px] text-indigo-700">{c.label || c.cell_key}</span>
                    </td>
                    {row.getVisibleCells().slice(1).map(vc => (
                      <td key={vc.id} className="px-2 py-1 text-center">
                        {hasFormula && c.per_player ? (
                          <span className="text-[13px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            {computedFormulas?.[`${c.id}:${displayPlayers.find(p => p.id === vc.column.id)?.id}`] ?? "—"}
                          </span>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              }
              return (
                <tr key={row.id} className={`border-b border-slate-100 ${isTotal ? "bg-indigo-50/60 font-bold border-t-2 border-t-indigo-200" : isSection ? "bg-indigo-50/30" : ri % 2 === 0 ? "bg-slate-50/40" : ""}`}>
                  {row.getVisibleCells().map(vc => (
                    <td key={vc.id} className={`px-2 py-1 first:pl-2 ${vc.column.id !== "category" ? "text-center" : ""}`}>
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
      return readOnly ? <span className="text-[13px] text-slate-900">{value || "—"}</span>
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full text-[13px] px-1.5 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white" placeholder="—" />;
    case "input:number":
      return readOnly ? <span className="text-[13px] font-mono font-semibold text-slate-900">{value || "—"}</span>
        : <input type="number" value={value} onChange={e => onChange(e.target.value)} className="w-16 text-[13px] font-mono text-center px-1 py-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 bg-white" placeholder="0" />;
    case "tally":
      return readOnly ? <span className="text-[13px] font-mono font-semibold text-slate-900">{value || "0"}</span>
        : <div className="inline-flex items-center gap-0.5"><button onClick={() => onTally?.(-1)} className="w-6 h-6 rounded bg-rose-50 text-rose-500 hover:bg-rose-100 text-xs font-bold">−</button><span className="text-[13px] font-mono font-semibold w-8 text-center tabular-nums">{value || "0"}</span><button onClick={() => onTally?.(1)} className="w-6 h-6 rounded bg-emerald-50 text-emerald-500 hover:bg-emerald-100 text-xs font-bold">+</button></div>;
    case "formula":
      return <span className="text-[13px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{formulaResult ?? "—"}</span>;
    default: return null;
  }
}
