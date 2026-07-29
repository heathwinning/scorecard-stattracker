"use client";

import { useEffect, useState } from "react";
import { listScorecards, Scorecard } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { HiOutlineClipboardList, HiOutlineArrowRight } from "react-icons/hi";
import { guestGetScorecards } from "@/lib/guest-store";

export default function ScorecardsPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      listScorecards().then((data) => setScorecards(data.scorecards)).finally(() => setLoading(false));
    } else {
      setScorecards(guestGetScorecards());
      setLoading(false);
    }
  }, [user, authLoading]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-3">
        <div className="h-8 w-40 bg-slate-200 rounded mb-6" />
        {[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-slate-100 rounded-2xl" />))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Scores</h1>
          <p className="page-subtitle">Game sessions you've tracked</p>
        </div>
        <Link href="/scores" className="btn-primary"><HiOutlineClipboardList className="w-4 h-4" /> New Scorecard</Link>
      </div>

      {scorecards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <p className="empty-state-title">No scorecards yet</p>
          <p className="empty-state-desc">Pick a template and start tracking your first game.</p>
          <Link href="/scores" className="btn-primary text-sm mt-2">Browse Scorecards</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {scorecards.map((sc) => (
            <Link key={sc.id} href={`/scorecards/${sc.id}`}
              className="card-hover flex items-center justify-between p-4 group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm group-hover:bg-violet-50 transition-colors">🎲</div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{sc.title || "Untitled Game"}</div>
                  <div className="text-xs text-slate-400">{sc.template_name} · {formatDate(sc.game_date)}</div>
                </div>
              </div>
              <HiOutlineArrowRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
