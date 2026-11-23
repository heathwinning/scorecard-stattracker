"use client";

import { useState } from "react";
import Link from "next/link";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import type { ScoredGame } from "@/lib/statistics";
import { scorecardDisplayTitle } from "@/lib/scorecard-title";

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

export const formatScore = (score: number) => number.format(score);
export const formatWinRate = (rate?: number) => rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
const formatDate = (value: string) => Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : "Unknown date";

export interface ScorePoint {
  game: ScoredGame;
  value: number;
}

export function ScoreTrend({ points, individual }: { points: ScorePoint[]; individual: boolean }) {
  const [activeId, setActiveId] = useState<string>();
  const hoveredIndex = points.findIndex(point => point.game.id === activeId);
  const activeIndex = hoveredIndex >= 0 ? hoveredIndex : points.length - 1;
  const active = points[activeIndex];
  if (!active) return <p className="py-12 text-center text-sm text-slate-500">No scores in this view.</p>;

  let low = active.value;
  let high = active.value;
  for (const point of points) {
    low = Math.min(low, point.value);
    high = Math.max(high, point.value);
  }
  const padding = low === high ? Math.max(1, Math.abs(low) * 0.1) : 0;
  const min = low - padding;
  const max = high + padding;
  const x = (index: number) => points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
  const y = (value: number) => ((max - value) / (max - min)) * 100;
  const coords = points.map((point, index) => [x(index), y(point.value)]);
  const move = (index: number) => setActiveId(points[index].game.id);
  const firstDate = formatDate(points[0].game.date);
  const lastDate = formatDate(points[points.length - 1].game.date);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="relative h-40 text-right text-xs tabular-nums text-slate-500">
          {[max, (max + min) / 2, min].map((tick, index) => (
            <span key={index} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{ top: `${index * 50}%` }}>{formatScore(tick)}</span>
          ))}
          <span className="invisible whitespace-nowrap">{formatScore(Math.abs(min) > Math.abs(max) ? min : max)}</span>
        </div>
        <div className="relative h-40" role="img" aria-label={`${individual ? "Player score" : "Average score"} across ${points.length} scorecards, ranging from ${formatScore(low)} to ${formatScore(high)}`}>
          {[0, 50, 100].map(top => <div key={top} className="absolute inset-x-0 border-t border-slate-200" style={{ top: `${top}%` }} />)}
          <div className="absolute inset-y-0 left-2 right-2">
            <div className="absolute inset-y-0 border-l border-dashed border-indigo-300" style={{ left: `${x(activeIndex)}%` }} />
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline points={coords.map(point => point.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="text-indigo-600" />
            </svg>
            {coords.map(([left, top], index) => (
              <span key={points[index].game.id} aria-hidden="true" className="absolute z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
                style={{ left: `${left}%`, top: `${top}%` }} onPointerEnter={() => move(index)} onClick={() => move(index)}>
                <span className={index === activeIndex ? "h-3 w-3 rounded-full bg-indigo-600 ring-2 ring-white shadow" : "h-1.5 w-1.5 rounded-full bg-indigo-600"} />
              </span>
            ))}
          </div>
        </div>
        <div className="col-start-2 mt-3 flex justify-between gap-2 text-xs text-slate-500">
          <span>{firstDate}</span>
          {firstDate !== lastDate && <span>{lastDate}</span>}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-indigo-50 px-3 py-2">
        <div className="min-w-0" aria-live="polite">
          <Link href={`/scores/${active.game.id}`} className="break-words text-sm font-semibold text-indigo-700 hover:underline">
            {scorecardDisplayTitle(active.game.title, active.game.templateName, active.game.date)}
          </Link>
          <p className="text-xs text-slate-600">{formatDate(active.game.date)} · {individual ? "Score" : "Average"} {formatScore(active.value)}</p>
        </div>
        {points.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" className="btn-ghost !p-1" aria-label="Previous scorecard" disabled={activeIndex === 0} onClick={() => move(activeIndex - 1)}><HiChevronLeft className="h-5 w-5" /></button>
            <span className="text-xs tabular-nums text-slate-600">{activeIndex + 1} / {points.length}</span>
            <button type="button" className="btn-ghost !p-1" aria-label="Next scorecard" disabled={activeIndex === points.length - 1} onClick={() => move(activeIndex + 1)}><HiChevronRight className="h-5 w-5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WinsChart({ bars, onSelect }: { bars: { key: string; label: string; value: number }[]; onSelect?: (key: string) => void }) {
  const max = bars.reduce((max, bar) => Math.max(max, bar.value), 1);
  return (
    <ul className="mt-5 max-h-72 space-y-3 overflow-y-auto">
      {bars.map(bar => (
        <li key={bar.key} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          {onSelect
            ? <button type="button" className="break-words text-left font-medium text-indigo-700 hover:underline" onClick={() => onSelect(bar.key)}>{bar.label}</button>
            : <span className="break-words font-medium text-slate-700">{bar.label}</span>}
          <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${bar.value / max * 100}%` }} />
          </div>
          <span className="min-w-5 text-right font-semibold tabular-nums text-slate-900">{bar.value}</span>
        </li>
      ))}
    </ul>
  );
}
