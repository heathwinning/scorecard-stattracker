"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender, type Row } from "@tanstack/react-table";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TemplateCell, TemplateRule } from "@/lib/api-client";
import { validateFormula } from "@/lib/formula";
import { HiOutlineTrash } from "react-icons/hi";
import Link from "next/link";

type BuilderRow = TemplateCell & { _idx: number };
const PREVIEW_PLAYERS = 2;
const ROW_TYPES = [
  { value: "heading", label: "Heading" },
  { value: "input:text", label: "Text" },
  { value: "input:number", label: "Number" },
  { value: "tally", label: "Tally" },
  { value: "formula", label: "Formula" },
] as const;

function fieldLabel(cell: TemplateCell) {
  return cell.label || "Untitled field";
}

function formulaPreview(expression: string, fields: TemplateCell[]) {
  const knownKeys = new Set(fields.map(field => field.cell_key));
  const safeExpression = expression.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, identifier =>
    knownKeys.has(identifier) || ["SUM", "AVG", "MIN", "MAX", "COUNT", "sum", "avg", "min", "max", "count", "PLAYER", "PLAYERS", "player", "players"].includes(identifier) ? identifier : "[Field]"
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

function RowProperties({ cell, allFields, modules, onChange, onDelete }: {
  cell: TemplateCell; allFields: TemplateCell[]; modules: TemplateRule[]; onChange: (u: TemplateCell) => void; onDelete: () => void;
}) {
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [formulaMode, setFormulaMode] = useState<"sum" | "running" | "advanced">("sum");
  const [fieldSearch, setFieldSearch] = useState("");
  const [functionSearch, setFunctionSearch] = useState("");
  const [pendingFunction, setPendingFunction] = useState<string | null>(null);
  const [expressionPart, setExpressionPart] = useState("");
  const formulaFields = allFields.filter(field => field.cell_key !== cell.cell_key && field.cell_type !== "heading");
  const headingFields = allFields.filter(field => field.cell_key !== cell.cell_key && field.cell_type === "heading");
  const repeatableGroups = [...new Map(allFields
    .map(field => ({
      key: (field.config_json as Record<string, unknown>)?.repeatable_group,
      label: (field.config_json as Record<string, unknown>)?.repeatable_label || field.label,
    }))
    .filter((group): group is { key: string; label: string } => typeof group.key === "string" && group.key.length > 0)
    .map(group => [group.key, group])).values()];
  const updateFormula = (formula: string) => {
    setFormulaError(validateFormula(formula));
    onChange({ ...cell, formula_expr: formula || null });
  };
  const appendFormula = (token: string) => updateFormula(`${cell.formula_expr || ""}${token}`);
  const fieldSuggestions = formulaFields.map((field, index) => {
    const displayName = `${fieldLabel(field)}${formulaFields.findIndex(item => fieldLabel(item) === fieldLabel(field)) !== index ? ` (${index + 1})` : ""}`;
    return { label: `This player: ${displayName}`, displayName, token: field.cell_key, aggregate: false };
  });
  const allPlayerSuggestions = fieldSuggestions.map(item => ({
    label: `All players total: ${item.displayName}`,
    token: `PLAYERS(${item.token})`,
    aggregate: true,
  }));
  const functionSuggestions = [
    { label: "Sum matching scores", token: "SUM(" },
    { label: "Average matching scores", token: "AVG(" },
    { label: "Lowest matching score", token: "MIN(" },
    { label: "Highest matching score", token: "MAX(" },
    { label: "Count matching scores", token: "COUNT(" },
  ];
  const fieldListId = `formula-fields-${cell.cell_key}`;
  const functionListId = `formula-functions-${cell.cell_key}`;
  const simpleSumKeys = (cell.formula_expr || "")
    .split("+")
    .map(token => token.trim())
    .filter(Boolean);
  const isSimpleSum = simpleSumKeys.length > 0 && simpleSumKeys.every(key => formulaFields.some(field => field.cell_key === key));
  const selectedSumKeys = isSimpleSum ? simpleSumKeys : [];
  useEffect(() => {
    const config = cell.config_json as Record<string, unknown>;
    setFormulaMode(config.repeatable_running_total ? "running" : (!isSimpleSum && !!cell.formula_expr ? "advanced" : "sum"));
    setPendingFunction(null);
  }, [cell.cell_key]);
  const changeFormulaMode = (mode: "sum" | "running" | "advanced") => {
    setFormulaMode(mode);
    if (mode === "running") {
      onChange({ ...cell, formula_expr: null, per_player: 1, config_json: { ...cell.config_json, repeatable_running_total: true } });
    } else if ((cell.config_json as Record<string, unknown>).repeatable_running_total) {
      onChange({ ...cell, config_json: { ...cell.config_json, repeatable_running_total: false } });
    }
  };
  const toggleSimpleSumField = (field: TemplateCell) => {
    const nextKeys = selectedSumKeys.includes(field.cell_key)
      ? selectedSumKeys.filter(key => key !== field.cell_key)
      : [...selectedSumKeys, field.cell_key];
    updateFormula(nextKeys.join(" + "));
  };
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
          {ROW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-500 tracking-wider block mb-1">Label</label>
        <input type="text" value={cell.label} onChange={e => onChange({ ...cell, label: e.target.value })}
          className="input-field text-sm" placeholder={cell.cell_type === "heading" ? "Section title" : "e.g. Score"} />
      </div>
      {cell.cell_type !== "heading" && cell.cell_type !== "formula" && (
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
      {cell.cell_type !== "heading" && cell.cell_type !== "formula" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!!(cell.config_json as Record<string, unknown>)?.section}
              onChange={e => onChange({ ...cell, config_json: { ...cell.config_json, section: e.target.checked, child: e.target.checked ? false : (cell.config_json as any)?.child, parent_heading: e.target.checked ? undefined : (cell.config_json as Record<string, unknown>)?.parent_heading } })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">Section heading</span>
          </label>
          <p className="text-[11px] text-slate-400 ml-6">Bold indigo label with highlighted background.</p>
          {!(cell.config_json as Record<string, unknown>)?.section && (
            <>
              <label className="block text-[11px] font-semibold tracking-wider text-slate-500">
                Nested under heading
                <select
                  value={String((cell.config_json as Record<string, unknown>)?.parent_heading || "")}
                  onChange={event => onChange({
                    ...cell,
                    config_json: {
                      ...cell.config_json,
                      parent_heading: event.target.value || undefined,
                      child: !!event.target.value,
                      section: event.target.value ? false : (cell.config_json as Record<string, unknown>)?.section,
                    },
                  })}
                  className="input-field mt-1 text-xs"
                >
                  <option value="">Not nested</option>
                  {headingFields.map(heading => <option key={heading.cell_key} value={heading.cell_key}>{fieldLabel(heading)}</option>)}
                </select>
              </label>
              <p className="text-[11px] text-slate-400">Links this field to a specific heading, even if rows are later reordered.</p>
            </>
          )}
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
          <label className="block text-[11px] font-semibold text-slate-500 tracking-wider">Show with variation
            <select value={String((cell.config_json as Record<string, unknown>)?.rule_key || "")} onChange={event => onChange({ ...cell, config_json: { ...cell.config_json, rule_key: event.target.value || undefined } })} className="input-field mt-1 text-xs">
              <option value="">Always show</option>
              {modules.map(module => <option key={module.rule_key} value={module.rule_key}>{module.label || "Untitled variation"}</option>)}
            </select>
          </label>
          <p className="text-[11px] text-slate-400">{modules.length ? "This row appears only when the selected variation is enabled for a new game." : "Add a variation above to make this row optional."}</p>
          <p className="text-[11px] text-slate-400">Give related fields the same group name to create addable rows.</p>
        </div>
      )}
      {cell.cell_type === "formula" && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500">Calculation</p>
          </div>
          <div className="flex flex-wrap rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Calculation type">
            <button type="button" role="tab" aria-selected={formulaMode === "sum"} onClick={() => changeFormulaMode("sum")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${formulaMode === "sum" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Total</button>
            <button type="button" role="tab" aria-selected={formulaMode === "running"} onClick={() => changeFormulaMode("running")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${formulaMode === "running" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Running total</button>
            <button type="button" role="tab" aria-selected={formulaMode === "advanced"} onClick={() => changeFormulaMode("advanced")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${formulaMode === "advanced" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Custom calculation</button>
          </div>
          {formulaMode === "sum" ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">Add these fields together</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Choose every score that belongs in this total.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {formulaFields.map(field => {
                const selected = selectedSumKeys.includes(field.cell_key);
                return (
                  <button key={field.cell_key} type="button" aria-pressed={selected} onClick={() => toggleSimpleSumField(field)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}>
                    {fieldLabel(field)}
                  </button>
                );
              })}
            </div>
            {!isSimpleSum && cell.formula_expr && <p className="mt-1.5 text-[11px] text-amber-600">Choosing a field replaces the current advanced calculation.</p>}
          </div>
          ) : formulaMode === "running" ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">Running total by round</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Shows each player’s cumulative score through every row in a repeatable group.</p>
              {repeatableGroups.length ? (
                <label className="mt-3 block text-[11px] font-semibold tracking-wider text-slate-500">Repeatable group
                  <select value={String((cell.config_json as Record<string, unknown>)?.repeatable_group || "")} onChange={event => onChange({ ...cell, config_json: { ...cell.config_json, repeatable_running_total: true, repeatable_group: event.target.value || undefined, inline_group: event.target.value || undefined } })} className="input-field mt-1 text-xs">
                    <option value="">Choose a group</option>
                    {repeatableGroups.map(group => <option key={group.key} value={group.key}>{group.label || group.key}</option>)}
                  </select>
                </label>
              ) : <p className="mt-3 text-[11px] text-amber-700">Create a repeatable group on the score fields first, then select it here.</p>}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-800">Custom calculation</p>
            <span title="Use functions, conditions, or cross-player fields for calculations that are more than a simple sum." className="cursor-help rounded-full border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">i</span>
            <Link href="/scorecards/formulas" target="_blank" className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline">Examples</Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input list={fieldListId} value={fieldSearch} onChange={event => {
              const selected = [...fieldSuggestions, ...allPlayerSuggestions].find(item => item.label === event.target.value);
              if (selected) {
                const token = pendingFunction && !selected.aggregate ? `${pendingFunction}(${selected.token})` : selected.token;
                appendFormula(token);
                setFieldSearch("");
                setPendingFunction(null);
              }
              else setFieldSearch(event.target.value);
            }} className="input-field text-xs" placeholder={pendingFunction ? `Choose a field for ${pendingFunction}` : "Search fields by name…"} />
            <datalist id={fieldListId}>
              {fieldSuggestions.map(item => <option key={item.label} value={item.label} />)}
              {allPlayerSuggestions.map(item => <option key={item.label} value={item.label} />)}
            </datalist>
            <input list={functionListId} value={functionSearch} onChange={event => {
              const selected = functionSuggestions.find(item => item.label === event.target.value);
              if (selected) { setPendingFunction(selected.token.slice(0, -1)); setFunctionSearch(""); }
              else setFunctionSearch(event.target.value);
            }} className="input-field text-xs" placeholder="Choose a function…" />
            <datalist id={functionListId}>{functionSuggestions.map(item => <option key={item.label} value={item.label} />)}</datalist>
          </div>
          <input value={expressionPart} onChange={event => setExpressionPart(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && expressionPart) { event.preventDefault(); appendFormula(expressionPart); setExpressionPart(""); } }} className="input-field text-xs" placeholder="Add an operator, bracket, or number, then press Enter" aria-label="Add formula text" />
          {pendingFunction && <p className="text-[11px] text-indigo-700">Choose a field to complete <span className="font-mono">{pendingFunction}(…)</span>.</p>}
            </div>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-h-5 font-mono text-xs leading-5 text-slate-700 break-words">
              {formulaMode === "running" ? <span className="font-sans text-slate-500">Calculated as a running total for the selected group.</span> : cell.formula_expr ? formulaPreview(cell.formula_expr, allFields) : <span className="font-sans text-slate-400">Choose fields above to calculate their total.</span>}
            </div>
            {formulaMode !== "running" && cell.formula_expr && <button type="button" onClick={() => updateFormula("")} className="shrink-0 text-[11px] font-medium text-slate-500 hover:text-rose-600">Clear</button>}
          </div>
          {formulaError && <p className="text-xs text-rose-500">{formulaError}</p>}
          {formulaMode !== "running" && <><label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={!cell.per_player}
              onChange={event => onChange({ ...cell, per_player: event.target.checked ? 0 : 1 })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-[11px] font-semibold text-slate-500 tracking-wider">One shared calculated result</span>
          </label>
          <p className="text-[11px] text-slate-400 ml-6">Only formulas can be shared. Choose “All players” in the field search to explicitly aggregate player scores.</p></>}
        </div>
      )}
    </div>
  );
}

export default function GridBuilder({ cells, modules = [], onChange }: { cells: TemplateCell[]; modules?: TemplateRule[]; onChange: (c: TemplateCell[]) => void }) {
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
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 truncate max-w-[180px]" title={c.cell_type === "formula" ? "Formula" : c.cell_type}>
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
    <div className="grid gap-4 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(32rem,1.3fr)]">
      <div className="flex-1 min-w-0">
        <div className="card overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedKeys} strategy={verticalListSortingStrategy}>
              <table className="w-full table-fixed border-collapse">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} className="bg-slate-50 border-b border-slate-200">
                      <th className="w-8" />
                      {hg.headers.map(h => (
                        <th key={h.id} className={`text-left text-[11px] font-semibold tracking-wider text-slate-400 ${h.id === "category" ? "w-36 px-2 py-1.5 first:pl-3" : "w-12 px-1 py-1.5"}`}>
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
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 text-center">{cells.length} rows · Drag ⠿ to reorder · Click to edit</p>
      </div>
      <div className="min-w-0">
        {selectedCell ? (
          <RowProperties cell={selectedCell} allFields={cells} modules={modules} onChange={updateCell} onDelete={() => deleteCell(selectedCell.cell_key)} />
        ) : (
          <div className="card p-4 text-center text-xs text-slate-400">Click a row to edit</div>
        )}
      </div>
    </div>
  );
}
