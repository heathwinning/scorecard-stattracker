"use client";

export const runtime = 'edge';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { listTemplates, listGames, Template, Game } from "@/lib/api-client";
import Link from "next/link";
import { HiOutlineTemplate } from "react-icons/hi";

const GAME_IDS: Record<string, string> = {
  yahtzee: "game-yahtzee",
  uno: "game-uno",
  catan: "game-catan",
  spades: "game-spades",
  scrabble: "game-scrabble",
  cornhole: "game-cornhole",
  poker: "game-poker",
  "phase-10": "game-phase10",
  "golf-card": "game-golf-card",
  "ticket-to-ride": "game-ticket-to-ride",
  wingspan: "game-wingspan",
};

export default function GameTemplatesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const gameId = GAME_IDS[slug];
  const [templates, setTemplates] = useState<Template[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listGames().then((d) => {
      const g = d.games?.find((g) => g.id === gameId) || null;
      setGame(g);
    }).catch(() => {});

    if (gameId) {
      listTemplates({ game: gameId })
        .then((data) => setTemplates(data.templates))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [gameId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <Link href="/templates" className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block">
        ← All Templates
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          {game?.icon} {game?.name || slug} Scorecard Templates
        </h1>
        <p className="text-slate-500 max-w-2xl">
          Free online {game?.name || slug} scorecard templates with auto-calculation. 
          Pick a template, add players, and start tracking scores instantly — no sign-up required.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-title">No templates yet for {game?.name || slug}</p>
          <p className="empty-state-desc">Be the first to create one!</p>
          <Link href="/templates/new" className="btn-primary text-sm mt-2">Create Template</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Link key={tpl.id} href={`/templates/${tpl.id}`} className="card-hover p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    <HiOutlineTemplate className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{tpl.name}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{tpl.description || "No description"}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>by {tpl.creator_name}</span>
                <span>·</span>
                <span className="badge-count">{tpl.cells?.length ?? 0} cells</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Cross-link section for SEO */}
      <div className="mt-16 pt-8 border-t border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">More Game Scorecard Templates</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GAME_IDS)
            .filter(([s]) => s !== slug)
            .map(([s, id]) => (
              <Link
                key={s}
                href={`/templates/game/${s}`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Templates
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
