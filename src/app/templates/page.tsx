"use client";

import { useEffect, useState, Suspense } from "react";
import { listTemplates, listGames, Template, Game } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HiOutlinePlus, HiOutlineTemplate } from "react-icons/hi";
import { guestGetTemplates } from "@/lib/guest-store";

function TemplatesPageInner() {
  const { user, isGuest } = useAuth();
  const searchParams = useSearchParams();
  const showMine = searchParams.get("mine") === "true";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">(showMine ? "mine" : "all");
  const [gameFilter, setGameFilter] = useState<string>("");

  useEffect(() => { listGames().then(d => setGames(d.games || [])).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    if (filter === "mine" && (isGuest || !user)) {
      let tpls = guestGetTemplates();
      if (gameFilter) tpls = tpls.filter(t => t.game_id === gameFilter);
      setTemplates(tpls);
      setLoading(false);
    } else {
      listTemplates({ mine: filter === "mine", game: gameFilter || undefined })
        .then((data) => setTemplates(data.templates))
        .finally(() => setLoading(false));
    }
  }, [filter, gameFilter, isGuest, user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Browse public templates or create your own</p>
        </div>
        {user && (
          <Link href="/templates/new" className="btn-primary">
            <HiOutlinePlus className="w-4 h-4" /> New Template
          </Link>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 w-fit">
        {(["all", "mine"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === f ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}>
            {f === "all" ? "Public Gallery" : "My Templates"}
          </button>
        ))}
      </div>

      {/* Game filter chips */}
      {filter === "all" && games.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            onClick={() => setGameFilter("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !gameFilter ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            All Games
          </button>
          {[...games].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
            <button
              key={g.id}
              onClick={() => setGameFilter(gameFilter === g.id ? "" : g.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                gameFilter === g.id ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}>
              {g.icon} {g.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 w-36 bg-slate-200 rounded mb-3" />
              <div className="h-4 w-56 bg-slate-100 rounded mb-3" />
              <div className="flex gap-2"><div className="h-5 w-14 bg-slate-100 rounded-full" /><div className="h-5 w-14 bg-slate-100 rounded-full" /></div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-title">{filter === "mine" ? "No templates yet" : "No public templates"}</p>
          <p className="empty-state-desc">{filter === "mine" ? "Create your first scorecard template." : "Be the first to share a template!"}</p>
          {user && <Link href="/templates/new" className="btn-primary text-sm mt-2"><HiOutlinePlus className="w-4 h-4" /> Create Template</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <Link key={tpl.id} href={`/templates/${tpl.id}`}
              className="card-hover p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    <HiOutlineTemplate className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{tpl.name}</h3>
                </div>
                {tpl.is_public ? <span className="badge-public shrink-0">Public</span> : <span className="badge-private shrink-0">Private</span>}
              </div>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{tpl.description || "No description"}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>by {tpl.creator_name}</span>
                <span>·</span>
                {tpl.game_icon && <span>{tpl.game_icon} {tpl.game_name}</span>}
                {!tpl.game_icon && <span className="badge-count">{tpl.cells?.length ?? 0} cells</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8 animate-pulse"><div className="h-64 bg-slate-100 rounded-2xl" /></div>}>
      <TemplatesPageInner />
    </Suspense>
  );
}
