"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TemplateCell } from "@/lib/api-client";
import { validateFormula } from "@/lib/formula";

// ---- Types ----

interface GridBuilderProps {
  cells: TemplateCell[];
  onChange: (cells: TemplateCell[]) => void;
}

const CELL_TYPES = [
  { value: "heading", label: "Heading", icon: "H", color: "indigo" },
  { value: "label", label: "Label", icon: "L", color: "slate" },
  { value: "input:text", label: "Text", icon: "Ab", color: "blue" },
  { value: "input:number", label: "Number", icon: "#", color: "cyan" },
  { value: "tally", label: "Tally", icon: "±", color: "violet" },
  { value: "formula", label: "Formula", icon: "fx", color: "amber" },
] as const;

const COLS = 8;
const ROWS = 24;

// ---- Sortable Cell ----

function SortableCell({
  cell,
  isSelected,
  onClick,
}: {
  cell: TemplateCell;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cell.cell_key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabel = CELL_TYPES.find((t) => t.value === cell.cell_type)?.icon ?? "?";

  const colorClasses: Record<string, string> = {
    heading: "bg-indigo-50 border-indigo-100",
    label: "bg-slate-50 border-slate-100",
    "input:text": "bg-white border-blue-200",
    "input:number": "bg-white border-cyan-200",
    tally: "bg-violet-50 border-violet-100",
    formula: "bg-amber-50 border-amber-100",
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        gridRow: `${cell.row_pos + 1} / span ${cell.row_span}`,
        gridColumn: `${cell.col_pos + 1} / span ${cell.col_span}`,
      }}
      className={`grid-cell border ${colorClasses[cell.cell_type] || "bg-white border-slate-200"} ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div {...attributes} {...listeners} className="absolute top-1.5 left-1.5 text-xs cursor-grab opacity-20 hover:opacity-100 select-none z-10 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-all">
        ⠿
      </div>
      <div className="p-2 h-full flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-white/80 rounded-md px-1.5 py-0.5 shadow-sm">{typeLabel}</span>
          <span className="text-xs font-medium truncate">{cell.label || cell.cell_key}</span>
        </div>
        {cell.formula_expr && (
          <div className="text-[10px] font-mono text-amber-700 mt-1 truncate">={cell.formula_expr}</div>
        )}
        {cell.per_player ? (
          <div className="text-[10px] text-indigo-500 mt-0.5 font-medium">👤 per player</div>
        ) : null}
      </div>
    </div>
  );
}

// ---- Properties Panel ----

function PropertiesPanel({
  cell,
  allCells,
  onChange,
  onDelete,
}: {
  cell: TemplateCell;
  allCells: TemplateCell[];
  onChange: (updated: TemplateCell) => void;
  onDelete: () => void;
}) {
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const handleFormulaChange = (expr: string) => {
    const err = validateFormula(expr);
    setFormulaError(err);
    onChange({ ...cell, formula_expr: expr || null });
  };

  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-900">Cell Properties</h3>
        <button onClick={onDelete} className="text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors">Delete</button>
      </div>

      {/* Cell Type */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
        <select value={cell.cell_type}
          onChange={(e) => onChange({ ...cell, cell_type: e.target.value as TemplateCell["cell_type"] })}
          className="input-field text-sm">
          {CELL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Key */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Key <span className="text-slate-300 font-normal">— formula ref</span></label>
        <input type="text" value={cell.cell_key} onChange={(e) => onChange({ ...cell, cell_key: e.target.value })}
          className="input-field text-sm font-mono" placeholder="e.g. round_1" />
      </div>

      {/* Label */}
      {cell.cell_type !== "heading" && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Label</label>
          <input type="text" value={cell.label} onChange={(e) => onChange({ ...cell, label: e.target.value })}
            className="input-field text-sm" placeholder="Display text" />
        </div>
      )}

      {/* Heading text */}
      {cell.cell_type === "heading" && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Heading</label>
          <input type="text" value={cell.label} onChange={(e) => onChange({ ...cell, label: e.target.value })}
            className="input-field text-sm font-medium" placeholder="Section heading" />
        </div>
      )}

      {/* Per-player toggle */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={!!cell.per_player}
          onChange={(e) => onChange({ ...cell, per_player: e.target.checked ? 1 : 0 })}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        <span className="text-sm text-slate-700">Per player</span>
      </label>

      {/* Formula editor */}
      {cell.cell_type === "formula" && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Formula</label>
          <textarea value={cell.formula_expr || ""} onChange={(e) => handleFormulaChange(e.target.value)}
            className="input-field text-sm font-mono h-24 resize-none" placeholder="e.g. SUM(round_*) or (a + b) / 2" />
          {formulaError && <p className="text-xs text-rose-500 mt-1">{formulaError}</p>}
          <div className="text-[11px] text-slate-400 mt-2 space-y-0.5">
            <p>Functions: <code className="bg-slate-100 px-1 rounded">SUM()</code> <code className="bg-slate-100 px-1 rounded">AVG()</code> <code className="bg-slate-100 px-1 rounded">MIN()</code> <code className="bg-slate-100 px-1 rounded">MAX()</code> <code className="bg-slate-100 px-1 rounded">COUNT()</code></p>
            <p>Available: {allCells.filter(c => c.cell_key !== cell.cell_key).map(c => <code key={c.cell_key} className="bg-amber-50 text-amber-700 px-1 rounded">{c.cell_key}</code>).length ? allCells.filter(c => c.cell_key !== cell.cell_key).map(c => <code key={c.cell_key} className="bg-amber-50 text-amber-700 px-1 rounded mr-1">{c.cell_key}</code>) : <span className="text-slate-300">none</span>}</p>
          </div>
        </div>
      )}

      {/* Span controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Row Span</label>
          <input type="number" min={1} max={10} value={cell.row_span}
            onChange={(e) => onChange({ ...cell, row_span: Math.max(1, parseInt(e.target.value) || 1) })}
            className="input-field text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Col Span</label>
          <input type="number" min={1} max={COLS} value={cell.col_span}
            onChange={(e) => onChange({ ...cell, col_span: Math.max(1, parseInt(e.target.value) || 1) })}
            className="input-field text-sm" />
        </div>
      </div>
    </div>
  );
}

// ---- Main GridBuilder ----

export default function GridBuilder({ cells, onChange }: GridBuilderProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const nextSortRef = useRef(cells.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const selectedCell = cells.find((c) => c.cell_key === selectedKey) ?? null;

  const addCell = useCallback(
    (type: TemplateCell["cell_type"]) => {
      const key = `cell_${nextSortRef.current++}`;
      const newCell: TemplateCell = {
        row_pos: 0,
        col_pos: 0,
        row_span: 1,
        col_span: 1,
        cell_type: type,
        cell_key: key,
        label: type === "heading" ? "New Heading" : "",
        formula_expr: null,
        per_player: 0,
        config_json: {},
        sort_order: cells.length,
      };
      onChange([...cells, newCell]);
      setSelectedKey(key);
    },
    [cells, onChange]
  );

  const updateCell = useCallback(
    (updated: TemplateCell) => {
      onChange(cells.map((c) => (c.cell_key === updated.cell_key ? updated : c)));
    },
    [cells, onChange]
  );

  const deleteCell = useCallback(
    (key: string) => {
      onChange(cells.filter((c) => c.cell_key !== key));
      if (selectedKey === key) setSelectedKey(null);
    },
    [cells, onChange, selectedKey]
  );

  const moveCell = useCallback(
    (key: string, rowDelta: number, colDelta: number) => {
      onChange(
        cells.map((c) =>
          c.cell_key === key
            ? {
                ...c,
                row_pos: Math.max(0, Math.min(ROWS - 1, c.row_pos + rowDelta)),
                col_pos: Math.max(0, Math.min(COLS - 1, c.col_pos + colDelta)),
              }
            : c
        )
      );
    },
    [cells, onChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Swap positions on drag
      const activeCell = cells.find((c) => c.cell_key === active.id);
      const overCell = cells.find((c) => c.cell_key === over.id);
      if (!activeCell || !overCell) return;

      onChange(
        cells.map((c) => {
          if (c.cell_key === active.id) {
            return { ...c, row_pos: overCell.row_pos, col_pos: overCell.col_pos };
          }
          if (c.cell_key === over.id) {
            return { ...c, row_pos: activeCell.row_pos, col_pos: activeCell.col_pos };
          }
          return c;
        })
      );
    },
    [cells, onChange]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Get unique keys for sortable context
  const cellKeys = cells.map((c) => c.cell_key);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Grid */}
      <div className="flex-1 min-w-0">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-slate-900">Grid Layout</h2>
            <div className="flex items-center gap-2">
              {selectedCell && (
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => moveCell(selectedCell.cell_key, -1, 0)} className="btn-ghost text-xs px-2 py-1 !rounded-md" title="Move up">↑</button>
                  <button onClick={() => moveCell(selectedCell.cell_key, 1, 0)} className="btn-ghost text-xs px-2 py-1 !rounded-md" title="Move down">↓</button>
                  <button onClick={() => moveCell(selectedCell.cell_key, 0, -1)} className="btn-ghost text-xs px-2 py-1 !rounded-md" title="Move left">←</button>
                  <button onClick={() => moveCell(selectedCell.cell_key, 0, 1)} className="btn-ghost text-xs px-2 py-1 !rounded-md" title="Move right">→</button>
                </div>
              )}
              <span className="badge-count">{cells.length} cells</span>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={cellKeys} strategy={rectSortingStrategy}>
              <div className="grid gap-[3px] bg-slate-100 rounded-xl p-[3px] min-h-[400px]" style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 44px)`,
              }}>
                {cells.map((cell) => (
                  <SortableCell key={cell.cell_key} cell={cell} isSelected={selectedKey === cell.cell_key} onClick={() => setSelectedKey(cell.cell_key)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-72 space-y-4 shrink-0">
        {/* Add cell buttons */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Cell</h3>
          <div className="grid grid-cols-2 gap-2">
            {CELL_TYPES.map((t) => (
              <button key={t.value} onClick={() => addCell(t.value)}
                className="btn-secondary text-xs py-2.5 flex items-center gap-1.5 justify-center font-medium">
                <span className="text-indigo-600 font-bold text-sm">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Properties */}
        {selectedCell && (
          <PropertiesPanel cell={selectedCell} allCells={cells} onChange={updateCell} onDelete={() => deleteCell(selectedCell.cell_key)} />
        )}

        {!selectedCell && (
          <div className="card p-5 text-center text-xs text-slate-400">
            <div className="text-2xl mb-2">👆</div>
            Click a cell to edit its properties
          </div>
        )}
      </div>
    </div>
  );
}
