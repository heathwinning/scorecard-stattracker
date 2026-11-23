"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { cleanPlayerName, MAX_PLAYER_NAME_LENGTH } from "@/lib/player-names";

function PlayerNameForm({ initialName, defaultName, save }: {
  initialName: string;
  defaultName: string;
  save: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = cleanPlayerName(name);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await save(value === defaultName ? "" : value);
      setName(value || defaultName);
      setSavedName(value || defaultName);
      setMessage("Player name saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t save your player name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <label htmlFor="profile-player-name" className="text-sm font-semibold text-slate-900">Player name</label>
        <input id="profile-player-name" className="input-field mt-2" maxLength={MAX_PLAYER_NAME_LENGTH}
          value={name} placeholder={defaultName} disabled={saving}
          onChange={event => { setName(event.target.value); setMessage(""); setError(""); }}
          aria-describedby="profile-player-name-help" />
        <p id="profile-player-name-help" className="mt-2 text-sm text-slate-500">
          This name fills your first player seat in a new game. Clear it to use {defaultName}.
        </p>
      </div>
      <button type="submit" className="btn-primary" disabled={saving || (cleanPlayerName(name) || defaultName) === savedName}>
        {saving ? "Saving…" : "Save player name"}
      </button>
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}

export default function ProfilePage() {
  const { user, isGuest, loading, signIn, updatePlayerName } = useAuth();
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <header className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          {user && !isGuest && <p className="page-subtitle">{user.email}</p>}
        </div>
        <Link href="/statistics" className="btn-secondary self-start">Statistics</Link>
      </header>
      {loading ? <p role="status" className="text-sm text-slate-500">Loading profile…</p> : user && !isGuest ? (
        <PlayerNameForm key={user.id} initialName={user.player_name} defaultName={user.default_player_name} save={updatePlayerName} />
      ) : (
        <div className="empty-state">
          <p className="empty-state-title">Sign in to edit your player name</p>
          <button type="button" className="btn-primary" onClick={signIn}>Sign in</button>
        </div>
      )}
    </div>
  );
}
