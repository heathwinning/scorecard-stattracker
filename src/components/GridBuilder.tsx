"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender, type Row } from "@tanstack/react-table";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TemplateCell } from "@/lib/api-client";
import { validateFormula } from "@/lib/formula";
import { HiOutlineTrash } from "react-icons/hi";

interface GridBuilderProps {
  cells: TemplateCell[];
  onChange: (cells: TemplateCell[]) => void;
}

type BuilderRow = TemplateCell & { _idx: number };

const ROW_TYPES = [
  { value: "heading", label: "Section Heading", icon: "📌" },
  { value: "input:text", label: "Text Input", icon: "✏️" },
  { value: "input:number", label: "Number Input", icon: "🔢" },
  { value: "tally", label: "Tally Counter", icon: "🔢" },
  { value: "formula", label: "Formula", icon: "🧮" },
] as const;

const PREVIEW_PLAYERS = 2;
const columnHelper = createColumnHelper<BuilderRow>();

// ---- Sortable table row using @dnd-kit ----
function SortableRow({ row, isSelected, onClick, onDelete }: {
  row: Row<BuilderRow>; isSelected: boolean; onClick: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.original.cell_key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isHeading = row.original.cell_type === "heading";

  if (isHeading) {
    return (
      <tr ref={setNodeRef} style={style} className={`border-b border-slate-100 cursor-pointer ${isSelected ? "bg-indigo-50/50" : "bg-indigo-50/30"}`} onClick={onClick}>
        <td className="w-10 shrink-0">
          <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab text-slate-300 hover:text-slate-500 select-none">⠿</div>
        </td>
        <td colSpan={1 + PREVIEW_PLAYERS + 1} className="px-3 py-2.5 font-bold text-sm text-indigo-800">
          {row.original.label || row.original.cell_key}
        </td>
      </tr>
    );
  }

  return (
    <tr ref={setNodeRef} style={style}
      className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}
      onClick={onClick}>
      <td className="w-10 shrink-0 align-middle">
        <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab text-slate-300 hover:text-slate-500 select-none">⠿</div>
      </td>
      {row.getVisibleCells().map(cell => (
        <td key={cell.id} className="px-3 py-2.5 align-middle" style={{ width: cell.column.getSize() }}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      <td className="w-10 shrink-0 align-middle">
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
          <HiOutlineTrash className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ---- Row Properties sidebar ----
function RowProperties({ cell, allKeys, onChange, onDelete }: {
  cell: TemplateCell; allKeys: string[]; onChange: (u: TemplateCell) => void; onDelete: () => void;
}) {
  const [formulaError, setFormulaError] = useState<string | null>(null);
  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-900">Row Properties</h3>
        <button onClick={onDelete} className="text-xs font-medium text-rose-500 hover:text-rose-700">Delete</button>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
        <select value={cell.cell_type} onChange={e => onChange({ ...cell, cell_type: e.target.value as TemplateCell["cell_type"] })}
          className="input-field text-sm">
          {ROW_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Row Label</label>
        <input type="text" value={cell.label} onChange={e => onChange({ ...cell, label: e.target.value })}
          className="input-field text-sm" placeholder={cell.cell_type === "heading" ? "Section title" : "e.g. Score"} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Key <span className="text-slate-300 font-normal">(formula ref)</span></label>
        <input type="text" value={cell.cell_key} onChange={e => onChange({ ...cell, cell_key: e.target.value })}
          className="input-field text-sm font-mono" placeholder="e.g. bird_points" />
      </div>
      {cell.cell_type === "formula" && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Formula</label>
          <textarea value={cell.formula_expr || ""}
            onChange={e => { const err = validateFormula(e.target.value); setFormulaError(err); onChange({ ...cell, formula_expr: e.target.value || null }); }}
            className="input-field text-sm font-mono h-24 resize-none" placeholder="e.g. SUM(bird_points, bonus)" />
          {formulaError && <p className="text-xs text-rose-500 mt-1">{formulaError}</p>}
          <div className="text-[11px] text-slate-400 mt-2">
            Keys: {allKeys.filter(k => k !== cell.cell_key).map(k => <code key={k} className="bg-amber-50 text-amber-700 px-1 rounded mr-1">{k}</code>)}
            {allKeys.filter(k => k !== cell.cell_key).length === 0 && <span className="text-slate-300">none yet</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Builder ----
export default function GridBuilder({ cells, onChange }: GridBuilderProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const nextSortRef = useRef(cells.length);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selectedCell = cells.find(c => c.cell_key === selectedKey) ?? null;
  const allKeys = cells.map(c => c.cell_key);

  // Sort cells by sort_order for display, but keep the full array for the table
  const data = useMemo(() => {
    return [...cells].sort((a, b) => a.sort_order - b.sort_order).map((c, i) => ({ ...c, _idx: i }));
  }, [cells]);

  // Build TanStack columns
  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: "category",
        header: "Score Category",
        cell: ({ row }) => {
          const c = row.original;
          const typeInfo = ROW_TYPES.find(t => t.value === c.cell_type);
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs shrink-0 opacity-50">{typeInfo?.icon}</span>
              <span className="text-sm font-medium text-slate-700 truncate">{c.label || c.cell_key}</span>
              {c.formula_expr && <code className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded truncate max-w-[100px] hidden sm:inline">={c.formula_expr}</code>}
            </div>
          );
        },
      }),
    ];
    for (let i = 0; i < PREVIEW_PLAYERS; i++) {
      cols.push(columnHelper.display({
        id: `player${i + 1}`,
        header: `Player ${i + 1}`,
        cell: ({ row }) => {
          const c = row.original;
          if (c.cell_type === "tally") return <span className="text-xs text-slate-300">− 0 +</span>;
          if (c.cell_type === "formula") return <span className="text-xs font-mono text-amber-400">0</span>;
          if (c.cell_type === "input:text") return <span className="text-xs text-slate-300">text</span>;
          return <span className="text-xs text-slate-300">0</span>;
        },
        size: 100,
      }));
    }
    return cols;
  }, []);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const addRow = useCallback((type: TemplateCell["cell_type"]) => {
    const key = `row_${nextSortRef.current++}`;
    onChange([...cells, {
      row_pos: cells.length, col_pos: 0, row_span: 1, col_span: 1,
      cell_type: type, cell_key: key,
      label: type === "heading" ? "New Section" : "",
      formula_expr: null, per_player: type !== "heading" ? 1 : 0,
      config_json: {}, sort_order: cells.length,
    }]);
    setSelectedKey(key);
  }, [cells, onChange]);

  const updateCell = useCallback((updated: TemplateCell) => {
    onChange(cells.map(c => c.cell_key === updated.cell_key ? updated : c));
  }, [cells, onChange]);

  const deleteCell = useCallback((key: string) => {
    onChange(cells.filter(c => c.cell_key !== key));
    if (selectedKey === key) setSelectedKey(null);
  }, [cells, onChange, selectedKey]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...cells].sort((a, b) => a.sort_order - b.sort_order);
    const oldIdx = sorted.findIndex(c => c.cell_key === active.id);
    const newIdx = sorted.findIndex(c => c.cell_key === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const [moved] = sorted.splice(oldIdx, 1);
    sorted.splice(newIdx, 0, moved);
    onChange(sorted.map((c, i) => ({ ...c, sort_order: i })));
  }, [cells, onChange]);

  const sortedKeys = useMemo(() =>
    [...cells].sort((a, b) => a.sort_order - b.sort_order).map(c => c.cell_key),
    [cells]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="card overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedKeys} strategy={verticalListSortingStrategy}>
              <table className="w-full border-collapse">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="w-10" />
                      {hg.headers.map(h => (
                        <th key={h.id} className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2.5 text-left"
                          style={{ width: h.getSize() }}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                      <th className="w-10" />
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <SortableRow key={row.original.cell_key} row={row}
                      isSelected={selectedKey === row.original.cell_key}
                      onClick={() => setSelectedKey(row.original.cell_key)}
                      onDelete={() => deleteCell(row.original.cell_key)} />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>
          <div className="p-3 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50">
            {ROW_TYPES.map(t => (
              <button key={t.value} onClick={() => addRow(t.value)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors flex items-center gap-1">
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">{cells.length} rows · Drag ⠿ to reorder · Click a row to edit</p>
      </div>

      <div className="w-full lg:w-72 space-y-4 shrink-0">
        {selectedCell ? (
          <RowProperties cell={selectedCell} allKeys={allKeys} onChange={updateCell} onDelete={() => deleteCell(selectedCell.cell_key)} />
        ) : (
          <div className="card p-5 text-center text-xs text-slate-400">
            <div className="text-2xl mb-2">👆</div>Click a row to edit its properties
          </div>
        )}
      </div>
    </div>
  );
}
