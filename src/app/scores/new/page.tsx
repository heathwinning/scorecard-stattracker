"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTemplate, createScorecard, updateScorecard, type TemplateCell, type ScorecardPlayer, type CellValue } from "@/lib/api-client";
import ScorecardFill from "@/components/ScorecardFill";
import toast from "react-hot-toast";

function NewScorecardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [values, setValues] = useState<CellValue[]>([]);
  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load template
  useEffect(() => {
    if (!templateId) { router.push("/scores"); return; }
    getTemplate(templateId)
      .then(data => {
        setCells(data.template.cells || []);
        setTemplateName(data.template.name);
      })
      .catch(() => toast.error("Scorecard not found"))
      .finally(() => setLoading(false));
  }, [templateId, router]);

  // Auto-create scorecard + auto-share + redirect to permanent URL
  useEffect(() => {
    if (!templateId || loading || cells.length === 0) return;
    let cancelled = false;
    const create = async () => {
      try {
        const result = await createScorecard({ template_id: templateId });
        if (cancelled) return;
        // Auto-share (creates share code)
        const shareRes = await fetch(`/api/scorecards/${result.scorecard.id}/share`, { method: "POST" }).then(r => r.json());
        const code = shareRes.share_code;
        // Add first player
        await updateScorecard(result.scorecard.id, {
          players: [{ id: crypto.randomUUID(), player_name: "P1", sort_order: 0 }],
        });
        if (!cancelled && code) router.replace(`/scores/${code}`);
      } catch { toast.error("Failed to create game"); }
    };
    create();
    return () => { cancelled = true; };
  }, [templateId, cells.length, loading, router]);

  const persist = useCallback(async () => {
    if (!scorecardId) return;
    try { await updateScorecard(scorecardId, { players, values }); } catch { /* silent */ }
  }, [scorecardId, players, values]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse"><div className="h-96 bg-slate-100 rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 page-enter">
      <h1 className="text-lg font-bold text-slate-900 mb-4">{templateName}</h1>
      {cells.length > 0 && (
        <ScorecardFill
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={setPlayers}
          onValuesChange={setValues}
          readOnly={false}
          isOwner={true}
          onPersist={persist}
        />
      )}
    </div>
  );
}

export default function NewScorecardPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-8 animate-pulse"><div className="h-96 bg-slate-100 rounded-2xl" /></div>}>
      <NewScorecardPageInner />
    </Suspense>
  );
}
