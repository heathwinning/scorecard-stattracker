"use client";

import { useState } from "react";
import { pickRandomIndex } from "@/lib/first-player/modes";

const WHEEL_SIZE = 280;
const WHEEL_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#0ea5e9", "#f43f5e", "#8b5cf6", "#14b8a6"];

interface Spin {
  rotation: number;
  durationMs: number;
}

export default function NamePick({ playerNames, durationSeconds }: { playerNames: string[]; durationSeconds: number }) {
  const [typedNames, setTypedNames] = useState("");
  const [spin, setSpin] = useState<Spin>({ rotation: 0, durationMs: 0 });
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const usingScorecardPlayers = playerNames.length > 0;
  const names = usingScorecardPlayers
    ? playerNames
    : typedNames.split("\n").map((name) => name.trim()).filter(Boolean);
  const nameCount = names.length;
  const sectorAngle = nameCount > 0 ? 360 / nameCount : 360;

  const gradient = names
    .map((_, index) => `${WHEEL_COLORS[index % WHEEL_COLORS.length]} ${index * sectorAngle}deg ${(index + 1) * sectorAngle}deg`)
    .join(", ");

  const startSpin = () => {
    if (nameCount === 0 || isSpinning) return;
    const winner = pickRandomIndex(nameCount);
    const laps = 4 + pickRandomIndex(3);
    const currentMod = ((spin.rotation % 360) + 360) % 360;
    const landingMod = ((360 - (winner + 0.5) * sectorAngle) % 360 + 360) % 360;
    let delta = landingMod - currentMod;
    if (delta < 0) delta += 360;
    setWinnerIndex(null);
    setIsSpinning(true);
    setSpin({ rotation: spin.rotation + delta + laps * 360, durationMs: durationSeconds * 1000 });
    window.setTimeout(() => {
      setWinnerIndex(winner);
      setIsSpinning(false);
    }, durationSeconds * 1000);
  };

  const buttonLabel = isSpinning ? "Spinning..." : winnerIndex !== null ? "Spin again" : "Spin the wheel";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      {usingScorecardPlayers ? (
        <p className="text-xs uppercase tracking-wide text-slate-400">Players from this scorecard</p>
      ) : (
        <div className="w-full max-w-sm">
          <label htmlFor="first-player-names" className="mb-2 block text-sm text-slate-300">
            Enter player names, one per line
          </label>
          <textarea
            id="first-player-names"
            rows={5}
            value={typedNames}
            onChange={(event) => setTypedNames(event.target.value)}
            disabled={isSpinning}
            className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:opacity-60"
            placeholder={"Alex\nBrook\nCasey"}
          />
        </div>
      )}

      <div className="relative" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
        <div
          className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 -translate-y-1/3 border-x-[12px] border-b-0 border-t-[22px] border-x-transparent border-t-amber-300 drop-shadow"
        />
        <div
          className="relative h-full w-full overflow-hidden rounded-full border-4 border-slate-700 shadow-2xl shadow-indigo-950/60"
          style={{
            background: nameCount > 0 ? `conic-gradient(${gradient})` : "#1e293b",
            transform: `rotate(${spin.rotation}deg)`,
            transition: spin.durationMs > 0 ? `transform ${spin.durationMs}ms cubic-bezier(0.17, 0.67, 0.12, 1)` : "none",
          }}
        >
          {names.map((name, index) => (
            <div
              key={`${name}-${index}`}
              className="absolute inset-0"
              style={{ transform: `rotate(${(index + 0.5) * sectorAngle}deg)` }}
            >
              <span className="absolute left-1/2 top-[14%] max-w-[40%] -translate-x-1/2 truncate text-sm font-bold text-white drop-shadow">
                {name}
              </span>
            </div>
          ))}
          {nameCount === 0 && (
            <div className="flex h-full items-center justify-center text-4xl font-extrabold text-slate-500">?</div>
          )}
        </div>
      </div>

      <p
        key={winnerIndex ?? "none"}
        className={`min-h-[2.5rem] text-4xl font-extrabold ${winnerIndex !== null ? "fp-winner text-amber-300" : "text-transparent"}`}
      >
        {winnerIndex !== null ? names[winnerIndex] : "."}
      </p>

      <button
        type="button"
        onClick={startSpin}
        disabled={nameCount === 0 || isSpinning}
        className="rounded-full bg-amber-400 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300 disabled:opacity-40"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
