"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getTemplate, createScorecard, updateScorecard, type TemplateCell, type ScorecardPlayer, type CellValue } from "@/lib/api-client";
import { guestGetTemplate, guestCreateScorecard, guestUpdateScorecard, guestGetScorecard } from "@/lib/guest-store";
import ScorecardFill from "@/components/ScorecardFill";
import Link from "next/link";
import toast from "react-hot-toast";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isGuest) { router.push("/login"); return; }
    if (!templateId) { router.push("/templates"); return; }

    const loadTemplate = async () => {
      // Try guest store first for guest- prefixed templates
      if (templateId.startsWith("guest-")) {
        const tpl = guestGetTemplate(templateId);
        if (tpl) { setCells(tpl.cells || []); setTemplateName(tpl.name); }
        setLoading(false);
        return;
      }
      // Otherwise from API
      try {
        const data = await getTemplate(templateId);
        setCells(data.template.cells || []);
        setTemplateName(data.template.name);
      } catch { toast.error("Template not found"); }
      setLoading(false);
    };
    loadTemplate();
  }, [user, isGuest, authLoading, templateId, router]);

  // Auto-create scorecard when template is loaded (for server-side)
  useEffect(() => {
    if (!templateId || loading || isGuest) return;
    if (cells.length === 0) return;
    createScorecard({ template_id: templateId })
      .then((result) => setScorecardId(result.scorecard.id))
      .catch(() => toast.error("Failed to create scorecard"));
  }, [templateId, cells.length, loading, isGuest]);

  useEffect(() => {
    if (!templateId || !isGuest || loading) return;
    if (cells.length === 0) return;
    // For guest, create locally
    const sc = guestCreateScorecard({ template_id: templateId, title: "" });
    setScorecardId(sc.id);
  }, [templateId, cells.length, loading, isGuest]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (isGuest) {
        if (scorecardId) {
          guestUpdateScorecard(scorecardId, { title, players, values });
          toast.success("Saved locally! Sign in to keep forever.");
          router.push(`/scorecards/${scorecardId}`);
        } else {
          const sc = guestCreateScorecard({ template_id: templateId!, title });
          guestUpdateScorecard(sc.id, { players, values });
          toast.success("Game started! Sign in to save permanently.");
          router.push(`/scorecards/${sc.id}`);
        }
      } else if (scorecardId) {
        await updateScorecard(scorecardId, { title, players, values });
        toast.success("Scorecard saved!");
        router.push(`/scorecards/${scorecardId}`);
      }
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }, [scorecardId, title, players, values, router, isGuest, templateId]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!user || !templateId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-1 transition-colors">
            ← Templates
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Game: {templateName}</h1>
        </div>
        <div className="flex gap-2">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Game title" className="input-field text-sm w-44" />
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving..." : "Save & Finish"}
          </button>
        </div>
      </div>

      {cells.length > 0 && (
        <ScorecardFill
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={setPlayers}
          onValuesChange={setValues}
        />
      )}
    </div>
  );
}

export default function NewScorecardPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8"><div className="animate-pulse h-64 bg-slate-100 rounded-xl" /></div>}>
      <NewScorecardPageInner />
    </Suspense>
  );
}
