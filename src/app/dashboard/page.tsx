"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { listTemplates, listScorecards, Template, Scorecard } from "@/lib/api-client";
import { guestGetTemplates, guestGetScorecards } from "@/lib/guest-store";
import Link from "next/link";
import { HiOutlineTemplate, HiOutlineClipboardList, HiOutlinePlus, HiOutlineArrowRight } from "react-icons/hi";

export default function DashboardPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      Promise.all([listTemplates({ mine: true }), listScorecards()])
        .then(([tData, sData]) => { setTemplates(tData.templates); setScorecards(sData.scorecards); })
        .finally(() => setLoading(false));
    } else {
      setTemplates(guestGetTemplates());
      setScorecards(guestGetScorecards());
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4"><div className="h-28 bg-slate-100 rounded-2xl" /><div className="h-28 bg-slate-100 rounded-2xl" /></div>
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!user) return <GuestDashboard templates={templates} scorecards={scorecards} />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      {/* Welcome */}
      <div className="card bg-gradient-to-br from-indigo-600 to-violet-700 border-0 p-6 sm:p-8 mb-8 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{user.name.split(" ")[0]}</h1>
            <p className="text-indigo-200 text-sm mt-2">Ready to track some scores?</p>
          </div>
          <Link href="/templates/new" className="btn-secondary !bg-white/20 !text-white !border-white/30 hover:!bg-white/30 !shadow-none text-sm">
            <HiOutlinePlus className="w-4 h-4" />New Template
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/templates?mine=true" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <HiOutlineTemplate className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{templates.length}</div>
            <div className="text-sm text-slate-500">My Templates</div>
          </div>
        </Link>
        <Link href="/scorecards" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <HiOutlineClipboardList className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{scorecards.length}</div>
            <div className="text-sm text-slate-500">Scorecards</div>
          </div>
        </Link>
      </div>

      {/* Recent scorecards */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Games</h2>
          {scorecards.length > 0 && (
            <Link href="/scorecards" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {scorecards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <p className="empty-state-title">No scorecards yet</p>
            <p className="empty-state-desc">Pick a template and start tracking your first game.</p>
            <Link href="/templates" className="btn-primary text-sm mt-2">Browse Templates</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {scorecards.slice(0, 5).map((sc) => (
              <Link key={sc.id} href={`/scorecards/${sc.id}`}
                className="card-hover flex items-center justify-between p-4 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm group-hover:bg-indigo-50 transition-colors">
                    🎲
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{sc.title || "Untitled Game"}</div>
                    <div className="text-xs text-slate-400">{sc.template_name} · {sc.game_date}</div>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My scorecards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">My Scorecards</h2>
          {templates.length > 0 && (
            <Link href="/templates?mine=true" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📐</div>
            <p className="empty-state-title">No scorecards yet</p>
            <p className="empty-state-desc">Create your first scorecard to get started.</p>
            <Link href="/templates/new" className="btn-primary text-sm mt-2">Create Scorecard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.slice(0, 4).map((tpl) => (
              <Link key={tpl.id} href={`/templates/${tpl.id}`}
                className="card-hover p-4 group flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">{tpl.name}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge-count">{tpl.cells?.length ?? 0} cells</span>
                    {tpl.is_public ? (
                      <span className="badge-public">Public</span>
                    ) : (
                      <span className="badge-private">Private</span>
                    )}
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Guest dashboard — same layout with sign-in prompt
function GuestDashboard({ templates, scorecards }: { templates: Template[]; scorecards: Scorecard[] }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="card bg-gradient-to-br from-indigo-600 to-violet-700 border-0 p-6 sm:p-8 mb-8 text-white shadow-lg shadow-indigo-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Getting started</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Guest</h1>
            <p className="text-indigo-200 text-sm mt-2">Sign in to save your data permanently.</p>
          </div>
          <Link href="/templates/new" className="btn-secondary !bg-white/20 !text-white !border-white/30 hover:!bg-white/30 !shadow-none text-sm">
            <HiOutlinePlus className="w-4 h-4" />New Template
          </Link>
        </div>
      </div>

      <div className="card bg-amber-50 border-amber-200 p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-sm font-medium text-amber-800">You're in guest mode</p>
            <p className="text-xs text-amber-600">Your data is saved in this browser only. Sign in to keep it forever.</p>
          </div>
        </div>
        <Link href="/login" className="btn-primary text-sm shrink-0">Sign in</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/templates?mine=true" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <HiOutlineTemplate className="w-6 h-6 text-indigo-600" />
          </div>
          <div><div className="text-2xl font-bold text-slate-900">{templates.length}</div><div className="text-sm text-slate-500">My Templates</div></div>
        </Link>
        <Link href="/scorecards" className="card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
            <HiOutlineClipboardList className="w-6 h-6 text-violet-600" />
          </div>
          <div><div className="text-2xl font-bold text-slate-900">{scorecards.length}</div><div className="text-sm text-slate-500">Scorecards</div></div>
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Games</h2>
        {scorecards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎮</div>
            <p className="empty-state-title">No scorecards yet</p>
            <p className="empty-state-desc">Pick a template and start tracking your first game.</p>
            <Link href="/templates" className="btn-primary text-sm mt-2">Browse Templates</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {scorecards.slice(0, 5).map((sc) => (
              <Link key={sc.id} href={`/scorecards/${sc.id}`} className="card-hover flex items-center justify-between p-4 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm group-hover:bg-indigo-50 transition-colors">🎲</div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{sc.title || "Untitled Game"}</div>
                    <div className="text-xs text-slate-400">{sc.template_name || "Custom"} · {sc.game_date}</div>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">My Templates</h2>
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📐</div>
            <p className="empty-state-title">No scorecards yet</p>
            <p className="empty-state-desc">Create your first scorecard template.</p>
            <Link href="/templates/new" className="btn-primary text-sm mt-2">Create Scorecard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.slice(0, 4).map((tpl) => (
              <Link key={tpl.id} href={`/templates/${tpl.id}`} className="card-hover p-4 group flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">{tpl.name}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="badge-count">{tpl.cells?.length ?? 0} cells</span>
                    <span className="badge-private">Local</span>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 ml-3" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
