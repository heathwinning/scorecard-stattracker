"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getTemplate, createScorecard, updateScorecard, type TemplateCell, type ScorecardPlayer, type CellValue } from "@/lib/api-client";
import { guestGetTemplate, guestCreateScorecard, guestUpdateScorecard } from "@/lib/guest-store";
import ScorecardFill from "@/components/ScorecardFill";
import Modal from "@/components/Modal";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiOutlineCog, HiOutlineClipboardCopy, HiOutlineShare } from "react-icons/hi";

function NewScorecardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const { user, loading: authLoading, isGuest } = useAuth();

  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [values, setValues] = useState<CellValue[]>([]);
  const [title, setTitle] = useState("");
  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState<"own" | "all">("own");

  const joinUrl = shareCode ? `${window.location.origin}/join/${shareCode}` : "";

  // Load template
  useEffect(() => {
    if (authLoading) return;
    if (!user && !isGuest) { router.push("/login"); return; }
    if (!templateId) { router.push("/scores"); return; }
    (async () => {
      if (templateId.startsWith("guest-")) {
        const tpl = guestGetTemplate(templateId);
        if (tpl) { setCells(tpl.cells || []); setTemplateName(tpl.name); }
        setLoading(false);
        return;
      }
      try {
        const data = await getTemplate(templateId);
        setCells(data.template.cells || []);
        setTemplateName(data.template.name);
      } catch { toast.error("Scorecard not found"); }
      setLoading(false);
    })();
  }, [user, isGuest, authLoading, templateId, router]);

  // Auto-create scorecard + auto-share
  useEffect(() => {
    if (!templateId || loading || cells.length === 0) return;
    const create = async () => {
      if (isGuest) {
        const sc = guestCreateScorecard({ template_id: templateId, title: "" });
        setScorecardId(sc.id);
        // Auto-generate share code for guest
        const code = generateCode();
        guestUpdateScorecard(sc.id, { share_code: code } as any);
        setShareCode(code);
      } else {
        try {
          const result = await createScorecard({ template_id: templateId });
          setScorecardId(result.scorecard.id);
          // Auto-share
          const shareResult = await fetch(`/api/scorecards/${result.scorecard.id}/share`, { method: "POST" }).then(r => r.json());
          if (shareResult.share_code) setShareCode(shareResult.share_code);
        } catch { toast.error("Failed to create game"); }
      }
    };
    create();
  }, [templateId, cells.length, loading, isGuest]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (isGuest && scorecardId) {
        guestUpdateScorecard(scorecardId, { title, players, values });
        toast.success("Saved locally!");
      } else if (scorecardId) {
        await updateScorecard(scorecardId, { title, players, values });
        toast.success("Scorecard saved!");
      }
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }, [scorecardId, title, players, values, isGuest]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!isGuest && !user) return null;
  if (!templateId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 page-enter">
      {/* Top bar: title + share + settings */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link href="/scores" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-0.5 transition-colors">
            ← My Scores
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 truncate">{title || templateName || "New Game"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {shareCode && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <HiOutlineShare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-mono font-bold text-indigo-700 tracking-wider">{shareCode}</span>
              <button onClick={copyLink} className="text-indigo-400 hover:text-indigo-600 transition-colors" title="Copy share link">
                <HiOutlineClipboardCopy className="w-3.5 h-3.5" />
              </button>
              {copied && <span className="text-[10px] text-indigo-500">Copied!</span>}
            </div>
          )}
          <button onClick={() => setSettingsOpen(true)} className="btn-secondary text-xs px-2.5 py-1.5">
            <HiOutlineCog className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scorecard */}
      {cells.length > 0 && (
        <ScorecardFill
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={setPlayers}
          onValuesChange={setValues}
          readOnly={false}
        />
      )}

      {/* Save button */}
      <div className="flex justify-end mt-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Game Settings">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Edit Permissions</label>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setEditMode("all")}
                className={`flex-1 text-xs font-medium px-3 py-2 rounded-md transition-all ${editMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Everyone can edit all scores
              </button>
              <button
                onClick={() => setEditMode("own")}
                className={`flex-1 text-xs font-medium px-3 py-2 rounded-md transition-all ${editMode === "own" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Players edit only their own
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">When players join with the share code, this controls what they can edit.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function NewScorecardPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8 animate-pulse"><div className="h-96 bg-slate-100 rounded-2xl" /></div>}>
      <NewScorecardPageInner />
    </Suspense>
  );
}
