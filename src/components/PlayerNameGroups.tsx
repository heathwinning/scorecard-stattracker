"use client";

import { useMemo, useState, type FormEvent } from "react";
import Modal from "@/components/Modal";
import { cleanPlayerName, MAX_GROUP_SOURCES, MAX_PLAYER_NAME_LENGTH, parsePlayerSource, type PlayerNameGroup } from "@/lib/player-names";
import { scorecardDisplayTitle } from "@/lib/scorecard-title";
import type { ScoredGame } from "@/lib/statistics";

interface NameSource {
  key: string;
  name: string;
  names: Set<string>;
  example?: string;
  account: boolean;
}

function availableSources(games: ScoredGame[]) {
  const sources = new Map<string, NameSource>();
  for (const game of games) {
    const example = scorecardDisplayTitle(game.title, game.templateName, game.date);
    for (const player of game.players) {
      const source = sources.get(player.key) ?? {
        key: player.key,
        name: player.name,
        names: new Set<string>(),
        account: parsePlayerSource(player.key)?.type === "account",
      };
      source.names.add(player.name);
      source.name = player.name;
      source.example = example;
      sources.set(player.key, source);
    }
  }
  return sources;
}

export default function PlayerNameGroups({ games, groups, guest, onClose, onSave, onDelete }: {
  games: ScoredGame[];
  groups: PlayerNameGroup[];
  guest: boolean;
  onClose: () => void;
  onSave: (group: PlayerNameGroup) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const sources = useMemo(() => availableSources(games), [games]);
  const [editing, setEditing] = useState<PlayerNameGroup>();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const openEditor = (group: PlayerNameGroup) => {
    setEditing(group);
    setError("");
    setSearch("");
    setConfirming(false);
  };
  const closeEditor = () => {
    if (saving) return;
    setEditing(undefined);
    setError("");
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave({ ...editing, name: cleanPlayerName(editing.name) });
      setEditing(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save this player group.");
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onDelete(id);
      setEditing(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t remove this player group.");
    } finally {
      setSaving(false);
    }
  }

  const selected = new Set(editing?.sources);
  const assigned = new Set(groups.filter(group => group.id !== editing?.id).flatMap(group => group.sources));
  const query = cleanPlayerName(search).toLowerCase();
  const options = [...sources.values()].filter(source => !assigned.has(source.key) && (
    selected.has(source.key) || [...source.names].some(name => name.toLowerCase().includes(query))
  )).sort((a, b) => Number(selected.has(b.key)) - Number(selected.has(a.key)) || a.name.localeCompare(b.name));
  const unavailable = [...selected].filter(key => !sources.has(key));
  const hasOverlap = selected.size > 1 && games.some(game => game.players.filter(player => selected.has(player.key)).length > 1);
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal open onClose={() => { if (!saving) onClose(); }} title="Manage player names">
      {editing ? (
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="canonical-player-name" className="text-sm font-semibold text-slate-900">Canonical name</label>
            <input id="canonical-player-name" className="input-field mt-1" value={editing.name} maxLength={MAX_PLAYER_NAME_LENGTH}
              onChange={event => setEditing({ ...editing, name: event.target.value })} required disabled={saving} placeholder="Name in your statistics" />
          </div>
          <fieldset disabled={saving}>
            <legend className="mb-1 text-sm font-semibold text-slate-900">Names and accounts to group</legend>
            <input type="search" aria-label="Search names and accounts" className="input-field mb-2" placeholder="Search player names"
              value={search} onChange={event => setSearch(event.target.value)} />
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {options.map(source => (
                <label key={source.key} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(source.key)} className="mt-1 accent-indigo-600"
                    disabled={selected.size >= MAX_GROUP_SOURCES && !selected.has(source.key)}
                    onChange={event => setEditing({ ...editing, sources: event.target.checked
                      ? [...editing.sources, source.key] : editing.sources.filter(key => key !== source.key) })} />
                  <span className="min-w-0 break-words">
                    <span className="block text-sm font-medium text-slate-800">{source.name}</span>
                    <span className="block text-xs text-slate-500">
                      {source.account ? "Linked account" : "Recorded name"} · {source.example}
                    </span>
                    {source.names.size > 1 && <span className="block text-xs text-slate-500">Also recorded as {[...source.names].filter(name => name !== source.name).join(", ")}</span>}
                  </span>
                </label>
              ))}
              {unavailable.map(key => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-600">
                  <input type="checkbox" checked className="accent-indigo-600"
                    onChange={() => setEditing({ ...editing, sources: editing.sources.filter(source => source !== key) })} />
                  {parsePlayerSource(key)?.type === "name" ? parsePlayerSource(key)?.value : "Linked account without scores"} · no current scores
                </label>
              ))}
              {!options.length && !unavailable.length && <p className="p-3 text-sm text-slate-500">No available names match your search.</p>}
            </div>
          </fieldset>
          {hasOverlap && <p className="text-xs text-amber-800">Some selected players appear on the same scorecard. Their seats stay separate for those games.</p>}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary" disabled={saving || !cleanPlayerName(editing.name) || !selected.size}>
              {saving ? "Saving…" : "Save group"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeEditor} disabled={saving}>Cancel</button>
            {groups.some(group => group.id === editing.id) && (
              <button type="button" className="btn-ghost ml-auto text-rose-700 hover:text-rose-800" disabled={saving}
                onClick={() => { if (confirming) void remove(editing.id); else setConfirming(true); }}>
                {confirming ? "Confirm ungroup" : "Ungroup"}
              </button>
            )}
          </div>
          {confirming && <p className="text-xs text-slate-500">The selected names will have separate statistics again. Saved scores stay on their scorecards.</p>}
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Group names that belong to the same person. The canonical name appears in your statistics, including for shared games.</p>
          {guest && <p className="text-xs text-slate-500">Guest name groups are saved in this browser.</p>}
          {sortedGroups.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {sortedGroups.map(group => (
                <li key={group.id}>
                  <button type="button" onClick={() => openEditor(group)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <span className="min-w-0 break-words text-sm font-medium text-slate-900">{group.name}</span>
                    <span className="shrink-0 text-xs font-medium text-indigo-700">Edit group</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-primary" disabled={sources.size === 0 || [...sources.keys()].every(key => assigned.has(key))}
            onClick={() => openEditor({ id: crypto.randomUUID(), name: "", sources: [] })}>New player group</button>
        </div>
      )}
    </Modal>
  );
}
