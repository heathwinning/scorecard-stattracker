"use client";

// Unified scorecard grid — replaces the old AG Grid live grid and the
// TanStack legacy grid with one hand-rolled, mobile-first table.
//
// Design notes:
// - Plain <table> with sticky header row and sticky label column. No grid
//   library: every cell is a custom input anyway, and full control over focus
//   is what makes live sync safe.
// - Inputs hold local state while focused and only sync from props when
//   blurred, so remote updates (polling) never steal focus or keystrokes.
// - Edits flow through onCellUpdate (per-cell persistence) when provided,
//   otherwise the component mutates `values` locally and calls onPersist
//   (used by draft/new-scorecard pages).
// - Remote value changes flash briefly so live players can see scores land.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { TemplateCell, ScorecardPlayer, CellValue } from "@/lib/api-client";
import { computeFormulaResults } from "@/lib/scorecard-formulas";
import { HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineX } from "react-icons/hi";

export type SaveState = "idle" | "saving" | "saved" | "error";

function displayCategoryLabel(cell: TemplateCell): string {
  if (cell.label) return cell.label;

  return cell.cell_key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

export interface ScorecardGridProps {
  cells: TemplateCell[];
  players: ScorecardPlayer[];
  values: CellValue[];
  onPlayersChange?: (p: ScorecardPlayer[]) => void;
  onValuesChange?: (v: CellValue[]) => void;
  readOnly?: boolean;
  myPlayerSlotId?: string | null;
  isOwner?: boolean;
  isLive?: boolean;
  privatePlayerScores?: boolean;
  onCellUpdate?: (cellId: string, playerId: string, value: string, isHidden: number, entryKey?: string) => void;
  onCellDelete?: (cellId: string, playerId: string, entryKey: string) => void;
  onPersist?: () => void;
  onMetadataPersist?: () => void;
  onPlayerNameEditingChange?: (editing: boolean) => void;
  onFlushPoll?: () => void;
  saveState?: SaveState;
}

const PREVIEW_PLAYERS: ScorecardPlayer[] = [
  { id: "preview-1", player_name: "P1", sort_order: 0 },
  { id: "preview-2", player_name: "P2", sort_order: 1 },
  { id: "preview-3", player_name: "P3", sort_order: 2 },
];

const vKey = (cellId: string, playerId: string, entryKey = "") => `${cellId}:${playerId}:${entryKey}`;

export default function ScorecardGrid({
  cells, players, values,
  onPlayersChange, onValuesChange,
  readOnly = false, myPlayerSlotId, isOwner = false, isLive = false, privatePlayerScores = false,
  onCellUpdate, onCellDelete, onPersist, onMetadataPersist,
  onPlayerNameEditingChange, onFlushPoll, saveState = "idle",
}: ScorecardGridProps) {
  const [mineOnly, setMineOnly] = useState(false);
  const [playersLocked, setPlayersLocked] = useState(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const tableRef = useRef<HTMLTableElement>(null);
  const initializedDefaultEntriesRef = useRef(new Set<string>());

  const isPreview = players.length === 0;
  const isMultiplayer = isLive || !!myPlayerSlotId;
  const restrictToOwnScores = privatePlayerScores && isMultiplayer && !isOwner && !!myPlayerSlotId;

  const sortedCells = useMemo(() =>
    cells
      .filter(c => (c.cell_type as string) !== "label" && c.sort_order >= 0)
      .sort((a, b) => a.sort_order - b.sort_order),
  [cells]);

  const displayRows = useMemo(() => {
    const rows: TemplateCell[][] = [];
    for (const cell of sortedCells) {
      const config = (cell.config_json || {}) as Record<string, unknown>;
      const inlineGroup = typeof config.inline_group === "string" ? config.inline_group : null;
      const previous = rows[rows.length - 1];
      const previousConfig = previous
        ? (previous[0].config_json || {}) as Record<string, unknown>
        : null;

      if (inlineGroup && previousConfig?.inline_group === inlineGroup) {
        previous.push(cell);
      } else {
        rows.push([cell]);
      }
    }
    return rows;
  }, [sortedCells]);

  const valueMap = useMemo(() => {
    const map = new Map<string, CellValue>();
    values.forEach(v => map.set(vKey(v.template_cell_id, v.player_id || "", v.entry_key || ""), v));
    return map;
  }, [values]);

  const formulaResults = useMemo(
    () => computeFormulaResults(cells, players, values),
    [cells, players, values]
  );

  // ---- remote-change flash -------------------------------------------------
  const [flashKeys, setFlashKeys] = useState<Set<string>>(() => new Set());
  const prevSnapshotRef = useRef<Map<string, string> | null>(null);
  const localEditsRef = useRef(new Map<string, number>()); // key -> last local edit ts
  useEffect(() => {
    const next = new Map<string, string>();
    values.forEach(v => next.set(vKey(v.template_cell_id, v.player_id || "", v.entry_key || ""), v.value));
    const prev = prevSnapshotRef.current;
    prevSnapshotRef.current = next;
    if (!prev) return; // initial load — don't flash everything
    const changed: string[] = [];
    const now = Date.now();
    next.forEach((value, key) => {
      const lastLocal = localEditsRef.current.get(key);
      if (lastLocal && now - lastLocal < 2500) return; // our own edit
      if (prev.has(key) && prev.get(key) !== value) changed.push(key);
    });
    if (!changed.length) return;
    setFlashKeys(current => {
      const s = new Set(current);
      changed.forEach(k => s.add(k));
      return s;
    });
    const timer = setTimeout(() => {
      setFlashKeys(current => {
        const s = new Set(current);
        changed.forEach(k => s.delete(k));
        return s;
      });
    }, 1400);
    return () => clearTimeout(timer);
  }, [values]);

  // ---- editing -------------------------------------------------------------
  const commit = useCallback((cell: TemplateCell, playerId: string, value: string, entryKey = "", hidden = 0) => {
    localEditsRef.current.set(vKey(cell.id!, playerId, entryKey), Date.now());
    if (onCellUpdate) { onCellUpdate(cell.id!, playerId, value, hidden, entryKey); return; }
    const current = valuesRef.current;
    const idx = current.findIndex(v => v.template_cell_id === cell.id && (v.player_id || "") === playerId && (v.entry_key || "") === entryKey);
    const nextValue: CellValue = { template_cell_id: cell.id!, player_id: playerId || null, entry_key: entryKey, value, is_hidden: hidden };
    const next = idx >= 0
      ? [...current.slice(0, idx), { ...current[idx], value, is_hidden: hidden }, ...current.slice(idx + 1)]
      : [...current, nextValue];
    valuesRef.current = next;
    onValuesChange?.(next);
    onPersist?.();
  }, [onCellUpdate, onValuesChange, onPersist]);

  const addEntry = useCallback((cell: TemplateCell, playerId: string) => {
    const entries = valuesRef.current.filter(v => v.template_cell_id === cell.id && (v.player_id || "") === playerId);
    const nextKey = String(entries.reduce((max, e) => Math.max(max, (parseInt(e.entry_key || "0", 10) || 0) + 1), entries.length));
    commit(cell, playerId, "", nextKey, 0);
    // For the local fallback path commit() already persisted; nothing else to do.
  }, [commit]);

  const removeEntry = useCallback((cell: TemplateCell, playerId: string, entryKey: string) => {
    const next = valuesRef.current.filter(v => !(v.template_cell_id === cell.id && (v.player_id || "") === playerId && (v.entry_key || "") === entryKey));
    valuesRef.current = next;
    onValuesChange?.(next);
    if (onCellDelete) onCellDelete(cell.id!, playerId, entryKey);
    else onPersist?.();
  }, [onCellDelete, onValuesChange, onPersist]);

  const renamePlayer = useCallback((playerId: string, name: string) => {
    if (!name.trim() || !onPlayersChange) return;
    onPlayersChange(players.map(p => p.id === playerId ? { ...p, player_name: name.trim() } : p));
    onMetadataPersist?.();
  }, [players, onPlayersChange, onMetadataPersist]);

  const addPlayer = useCallback(() => {
    if (!onPlayersChange) return;
    onPlayersChange([...players, { id: `new-${crypto.randomUUID().slice(0, 8)}`, player_name: `Player ${players.length + 1}`, sort_order: players.length }]);
    onMetadataPersist?.();
  }, [players, onPlayersChange, onMetadataPersist]);

  const removePlayer = useCallback((playerId: string) => {
    if (!onPlayersChange) return;
    onPlayersChange(players.filter(p => p.id !== playerId));
    onMetadataPersist?.();
  }, [players, onPlayersChange, onMetadataPersist]);

  // ---- spreadsheet keyboard navigation -------------------------------------
  // Tab moves through editable cells in row order (left/right, then wraps to
  // the next/previous row); Enter stays in the current player column and moves
  // down. Native browser tab order includes controls outside the grid, so this
  // explicit handling keeps rapid score entry predictable.
  const handleGridKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (!tableRef.current) return;

    if (e.key === "Tab") {
      const inputs = Array.from(
        tableRef.current.querySelectorAll<HTMLInputElement>('input[data-scorecard-input]:not(:disabled)')
      );
      const index = inputs.indexOf(input);
      const next = inputs[index + (e.shiftKey ? -1 : 1)];
      // Retain the browser's normal ability to leave the grid at either end.
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.select();
      return;
    }

    if (e.key !== "Enter") return;
    const row = Number(input.dataset.sgRow);
    const col = input.dataset.sgCol;
    if (Number.isNaN(row) || col === undefined) return;
    e.preventDefault();
    const candidates = Array.from(
      tableRef.current.querySelectorAll<HTMLInputElement>(`input[data-sg-col="${CSS.escape(col)}"]:not(:disabled)`)
    ).sort((a, b) => Number(a.dataset.sgRow) - Number(b.dataset.sgRow));
    const dir = e.shiftKey ? -1 : 1;
    const next = candidates.find(el => dir > 0 ? Number(el.dataset.sgRow) > row : false)
      ?? (dir < 0 ? [...candidates].reverse().find(el => Number(el.dataset.sgRow) < row) : undefined);
    if (next) { next.focus(); next.select(); }
    else input.blur();
  }, []);

  // ---- render helpers -------------------------------------------------------
  const displayPlayers = isPreview
    ? PREVIEW_PLAYERS
    : (restrictToOwnScores || (mineOnly && myPlayerSlotId)
      ? players.filter(p => p.id === myPlayerSlotId)
      : players);

  const canEditPlayer = useCallback((playerId: string) => {
    if (readOnly || isPreview) return false;
    if (!isMultiplayer) return true;
    return isOwner || playerId === myPlayerSlotId;
  }, [readOnly, isPreview, isMultiplayer, isOwner, myPlayerSlotId]);

  const entriesFor = useCallback((cellId: string, playerId: string) =>
    values
      .filter(v => v.template_cell_id === cellId && (v.player_id || "") === playerId)
      .sort((a, b) => (a.entry_key || "").localeCompare(b.entry_key || "")),
  [values]);

  const canManagePlayers = !readOnly && !isPreview && !playersLocked && (isOwner || !isMultiplayer);

  useEffect(() => {
    if (isPreview || readOnly) return;

    sortedCells.forEach(cell => {
      const config = (cell.config_json || {}) as Record<string, unknown>;
      const defaultEntries = Number(config.default_entries) || 0;
      if (!config.allow_multiple || defaultEntries < 1) return;

      players.forEach(player => {
        if (!player.id || !canEditPlayer(player.id)) return;

        for (let entryIndex = 0; entryIndex < defaultEntries; entryIndex += 1) {
          const entryKey = String(entryIndex);
          const entryId = `${cell.id}:${player.id}:${entryKey}`;
          const hasEntry = values.some(value =>
            value.template_cell_id === cell.id
            && (value.player_id || "") === player.id
            && (value.entry_key || "") === entryKey
          );

          if (!hasEntry && !initializedDefaultEntriesRef.current.has(entryId)) {
            initializedDefaultEntriesRef.current.add(entryId);
            commit(cell, player.id, String(config.default ?? ""), entryKey);
          }
        }
      });
    });
  }, [canEditPlayer, commit, isPreview, players, readOnly, sortedCells, values]);

  return (
    <section className="sg-shell">
      <div className="sg-toolbar">
        <div className="sg-toolbar-title">
          {isLive && <span className="sg-live-dot" aria-hidden />}
          <span>Scores</span>
          {!isPreview && (
            <span className="sg-player-count">{players.length} {players.length === 1 ? "player" : "players"}</span>
          )}
        </div>
        <div className="sg-toolbar-actions">
          {canManagePlayers && (
            <button onClick={addPlayer} className="sg-btn sg-btn-primary" type="button">+ Player</button>
          )}
          {!readOnly && !isPreview && (isOwner || !isMultiplayer) && players.length > 0 && (
            <button
              onClick={() => setPlayersLocked(v => !v)}
              className="sg-btn"
              type="button"
              title={playersLocked ? "Unlock player editing" : "Lock player editing"}
            >
              {playersLocked ? <HiOutlineLockClosed className="h-3.5 w-3.5" /> : <HiOutlineLockOpen className="h-3.5 w-3.5" />}
              <span className="sg-btn-label">{playersLocked ? "Locked" : "Lock"}</span>
            </button>
          )}
          {isMultiplayer && !restrictToOwnScores && myPlayerSlotId && players.length > 1 && (
            <div className="sg-toggle" role="tablist" aria-label="Scorecard view">
              <button type="button" onClick={() => setMineOnly(false)} className={!mineOnly ? "is-active" : ""}>All</button>
              <button type="button" onClick={() => setMineOnly(true)} className={mineOnly ? "is-active" : ""}>Mine</button>
            </div>
          )}
        </div>
      </div>

      <div className="sg-scroll">
        <table className="sg-table" ref={tableRef}>
          <thead>
            <tr>
              <th className="sg-th sg-th-label" scope="col"><span className="sr-only">Category</span></th>
              {displayPlayers.map(player => {
                const mine = !isPreview && !!myPlayerSlotId && player.id === myPlayerSlotId;
                const faded = !isPreview && !!myPlayerSlotId && !isOwner && player.id !== myPlayerSlotId;
                return (
                  <th key={player.id} scope="col" className={`sg-th sg-th-player ${mine ? "is-mine" : ""} ${faded ? "is-faded" : ""}`}>
                    <PlayerHeaderCell
                      player={player}
                      canEdit={!isPreview && !playersLocked && canEditPlayer(player.id!) && !readOnly}
                      canRemove={canManagePlayers && players.length > 1}
                      onCommit={name => renamePlayer(player.id!, name)}
                      onRemove={() => removePlayer(player.id!)}
                      onEditingChange={onPlayerNameEditingChange}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((rowCells, rowIndex) => {
              const cell = rowCells[0];
              const isInlineRow = rowCells.length > 1;
              const config = (cell.config_json || {}) as Record<string, unknown>;
              const isSection = !!config.section;
              const isChild = !!config.child;
              const isTotal = /total/i.test(cell.label || cell.cell_key);
              const label = displayCategoryLabel(cell);
              const help = typeof config.help === "string"
                ? config.help
                : cell.formula_expr
                  ? `Calculated automatically: ${cell.formula_expr}`
                  : undefined;

              if (cell.cell_type === "heading") {
                return (
                  <tr key={cell.id} className="sg-row sg-row-heading">
                    <td className="sg-td sg-td-label"><CategoryLabel label={label} className="sg-label sg-label-heading" help={help} /></td>
                    {displayPlayers.map(player => (
                      <td key={player.id} className="sg-td sg-td-value">
                        {cell.formula_expr && cell.per_player && !isPreview
                          ? <span className="sg-formula">{formulaResults[`${cell.id}:${player.id}`] ?? "—"}</span>
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              }

              const rowClass = isTotal ? "sg-row-total" : isSection ? "sg-row-section" : "";
              // Every stock scorecard ends with its primary calculated score
              // (Grand Total, Total Score, House Balance, etc.). Pin it so the
              // result remains visible while users enter a long scorecard.
              const isFinalScore = cell.cell_type === "formula" && rowIndex === sortedCells.length - 1;
              return (
                <tr key={cell.id} className={`sg-row ${rowClass} ${isFinalScore ? "sg-row-final-total" : ""}`}>
                  <td className="sg-td sg-td-label">
                    <CategoryLabel
                      label={label}
                      className={`sg-label ${isChild ? "is-child" : ""} ${isTotal ? "is-total" : ""} ${isSection ? "is-section" : ""}`}
                      help={help}
                    />
                  </td>
                  {displayPlayers.map((player, colIndex) => {
                    const mine = !isPreview && !!myPlayerSlotId && player.id === myPlayerSlotId;
                    const faded = !isPreview && !!myPlayerSlotId && !isOwner && player.id !== myPlayerSlotId;
                    const flash = rowCells.some(rowCell => flashKeys.has(vKey(rowCell.id!, player.id!, ""))) ? "sg-flash" : "";
                    return (
                      <td key={player.id} className={`sg-td sg-td-value ${mine ? "is-mine" : ""} ${flash}`}>
                        {isInlineRow ? (
                          <div className="sg-inline-fields">
                            {rowCells.map((inlineCell, fieldIndex) => {
                              const inlineConfig = (inlineCell.config_json || {}) as Record<string, unknown>;
                              const inlineLabel = typeof inlineConfig.inline_label === "string" ? inlineConfig.inline_label : inlineCell.label;
                              return (
                                <div key={inlineCell.id} className="sg-inline-field">
                                  {inlineLabel && <span className="sg-inline-label">{inlineLabel}</span>}
                                  <GridCell
                                    cell={inlineCell}
                                    player={player}
                                    rowIndex={rowIndex}
                                    colId={`${player.id!}-${fieldIndex}`}
                                    isPreview={isPreview}
                                    canEdit={canEditPlayer(player.id!)}
                                    faded={faded}
                                    mine={mine}
                                    valueMap={valueMap}
                                    entriesFor={entriesFor}
                                    formulaResults={formulaResults}
                                    flashKeys={flashKeys}
                                    onCommit={commit}
                                    onAddEntry={addEntry}
                                    onRemoveEntry={removeEntry}
                                    onKeyDownNav={handleGridKeyDown}
                                    onBlurFlush={onFlushPoll}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <GridCell
                            cell={cell}
                            player={player}
                            rowIndex={rowIndex}
                            colId={player.id!}
                            isPreview={isPreview}
                            canEdit={canEditPlayer(player.id!)}
                            faded={faded}
                            mine={mine}
                            valueMap={valueMap}
                            entriesFor={entriesFor}
                            formulaResults={formulaResults}
                            flashKeys={flashKeys}
                            onCommit={commit}
                            onAddEntry={addEntry}
                            onRemoveEntry={removeEntry}
                            onKeyDownNav={handleGridKeyDown}
                            onBlurFlush={onFlushPoll}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sg-footer">
        {(readOnly || isPreview || saveState === "saving" || saveState === "error") && (
          <span className="sg-footer-hint">
            {readOnly || isPreview ? (isPreview ? "Layout preview" : "Read-only view") : (
              saveState === "saving" ? "Saving…" : "Couldn't save — check your connection"
            )}
          </span>
        )}
        {saveState === "saved" && !readOnly && !isPreview && <span className="sg-footer-saved">✓ Saved</span>}
        {saveState === "error" && <span className="sg-footer-error">!</span>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function CategoryLabel({ label, className, help }: { label: string; className: string; help?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const tooltipId = `help-${label.replace(/\W+/g, "-").toLowerCase()}`;

  const showHelp = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const preferredWidth = Math.min(288, window.innerWidth - 16);
    // Position alongside the triggering row. Clamp the result to the viewport
    // so a narrow display never cuts the explanation off-screen.
    const left = Math.max(8, Math.min(rect.right + 8, window.innerWidth - preferredWidth - 8));
    const top = Math.max(8, Math.min(rect.top - 4, window.innerHeight - 112));
    setPosition({ top, left, width: preferredWidth });
  };

  return (
    <span className="sg-label-wrap">
      <span className={className}>{label}</span>
      {help && (
        <span className="sg-help">
          <button
            ref={triggerRef}
            type="button"
            className="sg-help-trigger"
            aria-label={`About ${label}`}
            aria-describedby={position ? tooltipId : undefined}
            onMouseEnter={showHelp}
            onMouseLeave={() => setPosition(null)}
            onFocus={showHelp}
            onBlur={() => setPosition(null)}
          >i</button>
          {position && createPortal(
            <span id={tooltipId} className="sg-help-popover" role="tooltip" style={position}>{help}</span>,
            document.body
          )}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------

function PlayerHeaderCell({ player, canEdit, canRemove, onCommit, onRemove, onEditingChange }: {
  player: ScorecardPlayer;
  canEdit: boolean;
  canRemove: boolean;
  onCommit: (name: string) => void;
  onRemove: () => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(player.player_name);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setLocal(player.player_name);
  }, [player.player_name]);

  if (!canEdit) return <span className="sg-player-name">{player.player_name}</span>;
  return (
    <span className="sg-player-header">
      <input
        ref={inputRef}
        value={local}
        aria-label="Player name"
        data-player-name-input=""
        className="sg-player-input"
        onFocus={() => { onEditingChange?.(true); inputRef.current?.select(); }}
        onChange={e => setLocal(e.target.value)}
        onBlur={e => { onCommit(e.currentTarget.value); onEditingChange?.(false); }}
        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
      />
      {canRemove && (
        <button type="button" onClick={onRemove} className="sg-player-remove" aria-label={`Remove ${player.player_name}`} title="Remove player">
          <HiOutlineX className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------

interface GridCellProps {
  cell: TemplateCell;
  player: ScorecardPlayer;
  rowIndex: number;
  colId: string;
  isPreview: boolean;
  canEdit: boolean;
  faded: boolean;
  mine: boolean;
  valueMap: Map<string, CellValue>;
  entriesFor: (cellId: string, playerId: string) => CellValue[];
  formulaResults: Record<string, number>;
  flashKeys: Set<string>;
  onCommit: (cell: TemplateCell, playerId: string, value: string, entryKey?: string, hidden?: number) => void;
  onAddEntry: (cell: TemplateCell, playerId: string) => void;
  onRemoveEntry: (cell: TemplateCell, playerId: string, entryKey: string) => void;
  onKeyDownNav: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlurFlush?: () => void;
}

function GridCell(props: GridCellProps) {
  const { cell, player, isPreview, canEdit, faded, mine, valueMap, entriesFor, formulaResults, flashKeys, onCommit, onAddEntry, onRemoveEntry, onKeyDownNav, onBlurFlush, rowIndex, colId } = props;
  const config = (cell.config_json || {}) as Record<string, unknown>;
  const allowMultiple = !!config.allow_multiple;

  if (isPreview) {
    if (cell.cell_type === "formula") return <span className="sg-preview-ghost">Σ</span>;
    if (allowMultiple) return <span className="sg-preview-ghost">0, …</span>;
    return <span className="sg-preview-ghost">{cell.cell_type === "input:text" ? "abc" : "0"}</span>;
  }

  if (cell.cell_type === "formula") {
    const result = formulaResults[cell.per_player ? `${cell.id}:${player.id}` : cell.id!];
    return <span className={`sg-formula ${faded ? "is-faded" : ""} ${mine ? "is-mine" : ""}`}>{result ?? "—"}</span>;
  }

  if (allowMultiple) {
    const entries = entriesFor(cell.id!, player.id!);
    return (
      <div className="sg-multi" role="group" aria-label={`${cell.label || cell.cell_key} entries`}>
        {entries.map(entry => {
          const ek = entry.entry_key || "0";
          const hidden = faded && entry.is_hidden === 1;
          const flash = flashKeys.has(vKey(cell.id!, player.id!, entry.entry_key || "")) ? "sg-flash" : "";
          return (
            <span key={ek} className={`sg-pill ${flash}`}>
              <ValueInput
                cell={cell}
                value={hidden ? "" : entry.value}
                placeholder={hidden ? "•••" : "0"}
                disabled={!canEdit || hidden}
                className="sg-pill-input"
                cellKey={vKey(cell.id!, player.id!, entry.entry_key || "")}
                rowIndex={rowIndex}
                colId={colId}
                onCommit={v => onCommit(cell, player.id!, v, entry.entry_key || "", entry.is_hidden || 0)}
                onKeyDownNav={onKeyDownNav}
                onBlurFlush={onBlurFlush}
              />
              {canEdit && entries.length > 1 && (
                <button type="button" className="sg-pill-remove" aria-label="Remove entry"
                  onClick={() => onRemoveEntry(cell, player.id!, entry.entry_key || "")}>×</button>
              )}
            </span>
          );
        })}
        {canEdit && (
          <button type="button" className="sg-pill-add" aria-label={`Add ${cell.label || cell.cell_key} entry`}
            onClick={() => onAddEntry(cell, player.id!)}>+</button>
        )}
      </div>
    );
  }

  const record = valueMap.get(vKey(cell.id!, player.id!, ""));
  const value = record?.value || "";
  const hidden = record?.is_hidden === 1;

  if (faded && hidden) {
    return <span className="sg-hidden" title="This player's value is hidden until revealed">•••</span>;
  }

  if (cell.cell_type === "tally") {
    if (!canEdit) return <span className={`sg-value ${faded ? "is-faded" : ""}`}>{value || "0"}</span>;
    const min = (config.min as number) ?? 0;
    const step = (config.step as number) ?? 1;
    const current = parseInt(value, 10) || 0;
    return (
      <span className="sg-tally">
        <button type="button" className="sg-tally-btn" aria-label={`Decrease ${cell.label || cell.cell_key}`}
          onClick={() => onCommit(cell, player.id!, String(Math.max(min, current - step)), "", hidden ? 1 : 0)}>−</button>
        <span className="sg-tally-value">{value || "0"}</span>
        <button type="button" className="sg-tally-btn" aria-label={`Increase ${cell.label || cell.cell_key}`}
          onClick={() => onCommit(cell, player.id!, String(current + step), "", hidden ? 1 : 0)}>+</button>
      </span>
    );
  }

  if (!canEdit) {
    return <span className={`sg-value ${faded ? "is-faded" : ""} ${mine ? "is-mine" : ""}`}>{value || "—"}</span>;
  }

  return (
    <ValueInput
      cell={cell}
      value={value}
      placeholder={cell.cell_type === "input:text" ? "" : "0"}
      disabled={false}
      className="sg-input"
      cellKey={vKey(cell.id!, player.id!, "")}
      rowIndex={rowIndex}
      colId={colId}
      onCommit={v => onCommit(cell, player.id!, v, "", hidden ? 1 : 0)}
      onKeyDownNav={onKeyDownNav}
      onBlurFlush={onBlurFlush}
    />
  );
}

// ---------------------------------------------------------------------------

function ValueInput({ cell, value, placeholder, disabled, className, cellKey, rowIndex, colId, onCommit, onKeyDownNav, onBlurFlush }: {
  cell: TemplateCell;
  value: string;
  placeholder: string;
  disabled: boolean;
  className: string;
  cellKey: string;
  rowIndex: number;
  colId: string;
  onCommit: (value: string) => void;
  onKeyDownNav: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlurFlush?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(value);

  // Sync from props only while not focused so remote updates never clobber typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setLocal(value);
  }, [value]);

  const isNumber = cell.cell_type === "input:number" || cell.cell_type === "tally";
  const allowDecimals = !!(cell.config_json as Record<string, unknown>)?.decimals;

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={isNumber ? (allowDecimals ? "decimal" : "numeric") : "text"}
      enterKeyHint="next"
      autoComplete="off"
      value={local}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={cell.label || cell.cell_key}
      data-scorecard-input=""
      data-cell-key={cellKey}
      data-sg-row={rowIndex}
      data-sg-col={colId}
      className={`${className} ${isNumber ? "sg-input-number" : "sg-input-text"}`}
      onFocus={e => e.currentTarget.select()}
      onChange={e => {
        let next = e.target.value;
        if (isNumber) next = next.replace(allowDecimals ? /[^0-9.\-]/g : /[^0-9\-]/g, "");
        setLocal(next);
        onCommit(next);
      }}
      onKeyDown={onKeyDownNav}
      onBlur={() => onBlurFlush?.()}
    />
  );
}
