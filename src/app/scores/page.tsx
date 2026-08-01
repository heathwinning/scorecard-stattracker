"use client";

import { useEffect, useState } from "react";
import { deleteScorecard, listScorecards, Scorecard } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { HiOutlineClipboardList, HiOutlineArrowRight, HiOutlineTrash } from "react-icons/hi";
import { guestDeleteScorecard, guestGetScorecards } from "@/lib/guest-store";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function ScorecardsPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && !isGuest) {
      listScorecards().then((data) => setScorecards(data.scorecards)).finally(() => setLoading(false));
    } else {
      setScorecards(guestGetScorecards());
      setLoading(false);
    }
  }, [user, authLoading, isGuest]);

  const toggleSelection = (scorecardId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(scorecardId)) next.delete(scorecardId);
      else next.add(scorecardId);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setDeleting(true);
    try {
      if (isGuest || !user) {
        idsToDelete.forEach(guestDeleteScorecard);
        setScorecards((current) => current.filter((scorecard) => !selectedIds.has(scorecard.id)));
        toast.success(`${idsToDelete.length} scorecard${idsToDelete.length === 1 ? "" : "s"} deleted`);
      } else {
        const results = await Promise.allSettled(idsToDelete.map((scorecardId) => deleteScorecard(scorecardId)));
        const deletedIds = new Set(
          results.flatMap((result, index) => result.status === "fulfilled" ? [idsToDelete[index]] : [])
        );
        setScorecards((current) => current.filter((scorecard) => !deletedIds.has(scorecard.id)));

        if (deletedIds.size === idsToDelete.length) {
          toast.success(`${deletedIds.size} scorecard${deletedIds.size === 1 ? "" : "s"} deleted`);
        } else {
          toast.error(`${idsToDelete.length - deletedIds.size} scorecard${idsToDelete.length - deletedIds.size === 1 ? "" : "s"} could not be deleted`);
        }
      }
      exitSelectionMode();
    } finally {
      setDeleting(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {scorecards.length > 0 && (
            <button onClick={selectionMode ? exitSelectionMode : () => setSelectionMode(true)} className="btn-secondary">
              {selectionMode ? "Cancel" : "Select"}
            </button>
          )}
          <Link href="/scorecards" className="btn-primary"><HiOutlineClipboardList className="w-4 h-4" /> New Scorecard</Link>
        </div>
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
          {selectionMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(selectedIds.size === scorecards.length ? new Set() : new Set(scorecards.map((scorecard) => scorecard.id)))}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {selectedIds.size === scorecards.length ? "Clear all" : "Select all"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="btn-danger text-xs"
                >
                  <HiOutlineTrash className="h-4 w-4" /> Delete selected
                </button>
              </div>
            </div>
          )}
          {scorecards.map((sc) => (
            <div key={sc.id} className="card-hover flex items-center justify-between gap-3 p-4 group">
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(sc.id)}
                  onChange={() => toggleSelection(sc.id)}
                  aria-label={`Select ${sc.title || "Untitled Game"}`}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              )}
              <Link href={`/scores/${sc.id}`} onClick={selectionMode ? (event) => { event.preventDefault(); toggleSelection(sc.id); } : undefined}
                className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-sm group-hover:bg-violet-50 transition-colors">🎲</div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm">{sc.title || "Untitled Game"}</div>
                  <div className="text-xs text-slate-400">{sc.template_name} · {formatDate(sc.game_date)}</div>
                </div>
              </div>
                {!selectionMode && <HiOutlineArrowRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-violet-500 transition-colors" />}
              </Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete scorecards?"
        message={`Delete ${selectedIds.size} selected scorecard${selectedIds.size === 1 ? "" : "s"}? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
