"use client";

import { useEffect, useState } from "react";
import { HiOutlineCog, HiOutlineX } from "react-icons/hi";
import {
  PLAYER_PICK_MODES,
  getModeSettings,
  getPlayerPickMode,
  type FirstPlayerPreferences,
  type PlayerPickMode,
} from "@/lib/first-player/modes";
import { useFirstPlayer } from "./FirstPlayerProvider";
import FingerPick from "./FingerPick";
import NamePick from "./NamePick";

export default function FirstPlayerOverlay() {
  const { isOpen } = useFirstPlayer();
  if (!isOpen) return null;
  return <PickerDialog />;
}

function PickerDialog() {
  const { closePicker, preferences, playerNames } = useFirstPlayer();
  const [view, setView] = useState<"pick" | "settings">("pick");
  const mode = getPlayerPickMode(preferences.modeId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closePicker]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900 text-white" role="dialog" aria-modal="true" aria-label="First player picker">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold">First player</p>
          <p className="text-xs text-slate-400">{view === "settings" ? "Settings" : mode.label}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView(view === "settings" ? "pick" : "settings")}
            aria-label="Picker settings"
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-slate-800 ${view === "settings" ? "bg-slate-800 text-indigo-300" : "text-slate-300"}`}
          >
            <HiOutlineCog className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={closePicker}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>
      </header>

      {view === "settings" ? (
        <SettingsView onDone={() => setView("pick")} />
      ) : (
        renderPickView(mode, preferences, playerNames)
      )}
    </div>
  );
}

function renderPickView(mode: PlayerPickMode, preferences: FirstPlayerPreferences, playerNames: string[]) {
  const settings = getModeSettings(preferences, mode.id);
  switch (mode.id) {
    case "fingers":
      return <FingerPick key={mode.id} autoStartSeconds={Number(settings.autoStartSeconds)} />;
    case "name-shuffle":
      return <NamePick key={mode.id} playerNames={playerNames} durationSeconds={Number(settings.durationSeconds)} />;
    default:
      return null;
  }
}

function SettingsView({ onDone }: { onDone: () => void }) {
  const { preferences, setModeId, setModeSetting } = useFirstPlayer();
  const activeMode = getPlayerPickMode(preferences.modeId);
  const activeSettings = getModeSettings(preferences, activeMode.id);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pick method</h2>
          {PLAYER_PICK_MODES.map((mode) => (
            <ModeOption
              key={mode.id}
              mode={mode}
              selected={mode.id === activeMode.id}
              onSelect={() => setModeId(mode.id)}
            />
          ))}
        </section>

        {activeMode.settingFields.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{activeMode.label} options</h2>
            {activeMode.settingFields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-sm text-slate-300">{field.label}</span>
                <select
                  value={activeSettings[field.key]}
                  onChange={(event) => setModeSetting(activeMode.id, field.key, event.target.value)}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        )}

        <button
          type="button"
          onClick={onDone}
          className="mt-auto rounded-full bg-indigo-500 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-400"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ModeOption({ mode, selected, onSelect }: { mode: PlayerPickMode; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-indigo-400 bg-indigo-500/15" : "border-slate-700 bg-slate-800/60 hover:border-slate-500"}`}
    >
      <p className="text-sm font-semibold">{mode.label}</p>
      <p className="mt-1 text-xs text-slate-400">{mode.description}</p>
    </button>
  );
}
