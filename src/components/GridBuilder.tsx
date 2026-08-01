"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender, type Row } from "@tanstack/react-table";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TemplateCell } from "@/lib/api-client";
import { validateFormula } from "@/lib/formula";
import { HiOutlineTrash } from "react-icons/hi";

type BuilderRow = TemplateCell & { _idx: number };
const PREVIEW_PLAYERS = 2;
const ROW_TYPES = [
  { value: "heading", label: "Heading", icon: "📌" },
  { value: "input:text", label: "Text", icon: "✏️" },
  { value: "input:number", label: "Number", icon: "🔢" },
  { value: "tally", label: "Tally", icon: "🔢" },
  { value: "formula", label: "Formula", icon: "🧮" },
] as const;

function fieldLabel(cell: TemplateCell) {
  return cell.label || "Untitled field";
}

function formulaPreview(expression: string, fields: TemplateCell[]) {
  const knownKeys = new Set(fields.map(field => field.cell_key));
  const safeExpression = expression.replace(/\b[A-Za-z_][A-Za-z0-9_]*\*?\b/g, identifier =>
    knownKeys.has(identifier) || ["SUM", "AVG", "MIN", "MAX", "COUNT"].includes(identifier) ? identifier : "[Field]"
  );
  return fields
    .slice()
    .sort((left, right) => right.cell_key.length - left.cell_key.length)
    .reduce((preview, field) => {
      const escapedKey = field.cell_key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return preview.replace(new RegExp(`\\b${escapedKey}\\b`, "g"), `[${fieldLabel(field)}]`);
    }, safeExpression);
}

function SortableRow({ row, isSelected, onClick, onDelete }: {
  row: Row<BuilderRow>; isSelected: boolean; onClick: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.original.cell_key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const isHeading = row.original.cell_type === "heading";
  return (
    <tr ref={setNodeRef} style={style}
      className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-indigo-50/60" : isHeading ? "bg-indigo-50/30" : "hover:bg-slate-50"}`}
      onClick={onClick}>
      <td className="w-8 shrink-0 align-middle">
        <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab text-slate-300 hover:text-slate-500 select-none text-xs">⠿</div>
      </td>
      {isHeading ? (
        <td colSpan={1 + PREVIEW_PLAYERS + 1} className="px-3 py-1.5 font-semibold text-[13px] text-indigo-700">
          {row.original.label || "Untitled section"}
        </td>
      ) : (
        <>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id} className="px-2 py-1 align-middle">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
          <td className="w-8 shrink-0 align-middle">
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
              <HiOutlineTrash className="w-3.5 h-3.5" />
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function RowProperties({ cell, allFields, onChange, onDelete }: {
  cell: TemplateCell; allFields: TemplateCell[]; onChange: (u: TemplateCell) => void; onDelete: () => void;
}) {
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState("");
  const [numberToken, setNumberToken] = useState("");
  const formulaFields = allFields.filter(field => field.cell_key !== cell.cell_key && field.cell_type !== "heading");
  const updateFormula = (formula: string) => {
    setFormulaError(validateFormula(formula));
    onChange({ ...cell, formula_expr: formula || null });
  };
  const appendFormula = (token: string) => updateFormula(`${cell.formula_expr || ""}${token}`);
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-900">Row Properties</h3>
        <button onClick={onDelete} className="text-xs font-medium text-rose-500 hover:text-rose-700">Delete</button>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 tracking-wider block mb-1">Type</label>
        <select value={cell.cell_type} onChange={e => onChange({ ...cell, cell_type: e.target.value as TemplateCell["cell_type"] })}
          className="input-field text-sm">
          {ROW_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 tracking-wider block mb-1">Label</label>
        <input type="text" value={cell.label} onChange={e => onChange({ ...cell, label: e.target.value })}
          className="input-field text-sm" placeholder={cell.cell_type === "heading" ? "Section title" : "e.g. Score"} />
      </div>
      {cell.cell_type !== "heading" && (
        <div>
          <label className="text-[11px] font-semibold text-slate-500 tracking-wider block mb-1">Help text <span className="font-normal text-slate-300">(optional)</span></label>
          <textarea value={String((cell.config_json as Record<string, unknown>)?.help || "")}
            onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, help: e.target.value || undefined } })}
            className="input-field h-16 resize-none text-sm" placeholder="Explain how this score is recorded" />
        </div>
      )}
      {(cell.cell_type === "input:number" || cell.cell_type === "tally") && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!(cell.config_json as Record<string, unknown>)?.allow_multiple}
              onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, allow_multiple: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">Allow multiple entries</span>
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5 ml-6">Players can add or remove entries, such as completed bonus cards.</p>
        </div>
      )}
      {cell.cell_type !== "heading" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!(cell.config_json as Record<string, unknown>)?.section}
              onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, section: e.target.checked, child: e.target.checked ? false : (cell.config_json as any)?.child } })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">Section heading</span>
          </label>
          <p className="text-[11px] text-slate-400 ml-6">Bold indigo label with highlighted background.</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!(cell.config_json as Record<string, unknown>)?.child}
              onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, child: e.target.checked, section: e.target.checked ? false : (cell.config_json as any)?.section } })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">Nested under above</span>
          </label>
          <p className="text-[11px] text-slate-400 ml-6">Indented under the previous section heading.</p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="text-[11px] font-semibold text-slate-500 tracking-wider">
              Repeatable group
              <input
                value={String((cell.config_json as Record<string, unknown>)?.repeatable_group || "")}
                onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, repeatable_group: e.target.value || undefined, inline_group: e.target.value || undefined } })}
                className="input-field mt-1 text-xs"
                placeholder="e.g. rounds"
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-500 tracking-wider">
              Inline label
              <input
                value={String((cell.config_json as Record<string, unknown>)?.inline_label || "")}
                onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, inline_label: e.target.value || undefined } })}
                className="input-field mt-1 text-xs"
                placeholder="e.g. Score"
              />
            </label>
          </div>
          <label className="block text-[11px] font-semibold text-slate-500 tracking-wider">Optional module key
            <input value={String((cell.config_json as Record<string, unknown>)?.rule_key || "")} onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, rule_key: e.target.value || undefined } })} className="input-field mt-1 text-xs" placeholder="e.g. oceania" />
          </label>
          <p className="text-[11px] text-slate-400">This row is shown only when the matching optional module is selected.</p>
          <p className="text-[11px] text-slate-400">Give related fields the same group name to create addable rows.</p>
        </div>
      )}
      {cell.cell_type === "formula" && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-500 tracking-wider block">Formula</label>
          <div className="min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700 break-words">
            {cell.formula_expr ? formulaPreview(cell.formula_expr, allFields) : <span className="font-sans text-slate-400">Build a calculation using fields below.</span>}
          </div>
          <div className="flex gap-2">
            <select value={selectedFieldKey} onChange={event => setSelectedFieldKey(event.target.value)} className="input-field min-w-0 flex-1 text-xs">
              <option value="">Choose a field</option>
              {formulaFields.map(field => <option key={field.cell_key} value={field.cell_key}>{fieldLabel(field)}</option>)}
            </select>
            <button type="button" disabled={!selectedFieldKey} onClick={() => appendFormula(selectedFieldKey)} className="btn-secondary shrink-0 px-2 text-xs disabled:opacity-40">Insert</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[" + ", " - ", " * ", " / ", "(", ")", "SUM(", "AVG(", "MIN(", "MAX("].map(token => (
              <button key={token} type="button" onClick={() => appendFormula(token)} className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700">{token.trim() || "+"}</button>
            ))}
            <input value={numberToken} onChange={event => setNumberToken(event.target.value.replace(/[^0-9.\-]/g, ""))} className="w-16 rounded border border-slate-200 px-2 py-1 text-xs" inputMode="decimal" placeholder="Number" />
            <button type="button" disabled={!numberToken} onClick={() => { appendFormula(numberToken); setNumberToken(""); }} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 disabled:opacity-40">Insert</button>
            <button type="button" onClick={() => updateFormula("")} className="ml-auto text-xs text-rose-600 hover:text-rose-700">Clear</button>
          </div>
          {formulaError && <p className="text-xs text-rose-500">{formulaError}</p>}
          <label className="mt-3 flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!(cell.config_json as Record<string, unknown>)?.repeatable_running_total}
              onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, repeatable_running_total: e.target.checked } })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">Running total for repeatable group</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function GridBuilder({ cells, onChange }: { cells: TemplateCell[]; onChange: (c: TemplateCell[]) => void }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const selectedCell = cells.find(c => c.cell_key === selectedKey) ?? null;

  const data = useMemo(() =>
    [...cells].sort((a, b) => a.sort_order - b.sort_order).map((c, i) => ({ ...c, _idx: i })),
  [cells]);

  const columnHelper = createColumnHelper<BuilderRow>();
  const columns = useMemo(() => {
    const cols = [columnHelper.display({
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const c = row.original;
        const ti = ROW_TYPES.find(t => t.value === c.cell_type);
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 truncate max-w-[180px]" title={c.cell_type === "formula" ? "Formula" : c.cell_type}>
            <span className="text-xs opacity-50 shrink-0">{ti?.icon}</span>
            <span className="truncate">{fieldLabel(c)}</span>
          </span>
        );
      },
    })];
    for (let i = 0; i < PREVIEW_PLAYERS; i++) {
      cols.push(columnHelper.display({
        id: `p${i + 1}`,
        header: `P${i + 1}`,
        cell: ({ row }) => {
          const c = row.original;
          if (c.cell_type === "tally") return <span className="text-[11px] text-slate-300">−0+</span>;
          if (c.cell_type === "formula") return <span className="text-[11px] font-mono text-amber-400">0</span>;
          return <span className="text-[11px] text-slate-300">{c.cell_type === "input:text" ? "abc" : "0"}</span>;
        },
      }));
    }
    return cols;
  }, [columnHelper]);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const addRow = useCallback((type: TemplateCell["cell_type"]) => {
    const key = `field_${crypto.randomUUID().replaceAll("-", "")}`;
    onChange([...cells, {
      row_pos: 0, col_pos: 0, row_span: 1, col_span: 1,
      cell_type: type, cell_key: key,
      label: type === "heading" ? "New Section" : "",
      formula_expr: null, per_player: type !== "heading" ? 1 : 0,
      config_json: {}, sort_order: cells.length,
    }]);
    setSelectedKey(key);
  }, [cells, onChange]);

  const updateCell = useCallback((u: TemplateCell) => onChange(cells.map(c => c.cell_key === u.cell_key ? u : c)), [cells, onChange]);
  const deleteCell = useCallback((key: string) => { onChange(cells.filter(c => c.cell_key !== key)); if (selectedKey === key) setSelectedKey(null); }, [cells, onChange, selectedKey]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const sorted = [...cells].sort((a, b) => a.sort_order - b.sort_order);
    const oi = sorted.findIndex(c => c.cell_key === active.id);
    const ni = sorted.findIndex(c => c.cell_key === over.id);
    if (oi === -1 || ni === -1) return;
    const [m] = sorted.splice(oi, 1);
    sorted.splice(ni, 0, m);
    onChange(sorted.map((c, i) => ({ ...c, sort_order: i })));
  }, [cells, onChange]);

  const sortedKeys = useMemo(() => [...cells].sort((a, b) => a.sort_order - b.sort_order).map(c => c.cell_key), [cells]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <div className="card overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedKeys} strategy={verticalListSortingStrategy}>
              <table className="w-full border-collapse table-auto">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="bg-slate-50 border-b border-slate-200">
                      <th className="w-8" />
                      {hg.headers.map(h => (
                        <th key={h.id} className="text-[11px] font-semibold text-slate-400 tracking-wider px-2 py-1.5 text-left first:pl-3">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                      <th className="w-8" />
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
          <div className="p-2 flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/50">
            {ROW_TYPES.map(t => (
              <button key={t.value} onClick={() => addRow(t.value)}
                className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors flex items-center gap-1">
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">{cells.length} rows · Drag ⠿ to reorder · Click to edit</p>
      </div>
      <div className="w-full lg:w-64 shrink-0">
        {selectedCell ? (
          <RowProperties cell={selectedCell} allFields={cells} onChange={updateCell} onDelete={() => deleteCell(selectedCell.cell_key)} />
        ) : (
          <div className="card p-4 text-center text-xs text-slate-400">👆 Click a row to edit</div>
        )}
      </div>
    </div>
  );
}
