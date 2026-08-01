"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createTemplate, updateTemplate, getTemplate, listGames, type TemplateCell, type Game, type TemplateRule } from "@/lib/api-client";
import { guestSaveTemplate, guestUpdateTemplate, guestGetTemplate } from "@/lib/guest-store";
import GridBuilder from "@/components/GridBuilder";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props { params?: { id?: string }; }

export default function TemplateNewPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8 animate-pulse"><div className="h-96 bg-slate-100 rounded-2xl" /></div>}>
      <TemplateNewPageInner params={params} />
    </Suspense>
  );
}

function TemplateNewPageInner({ params }: Props) {
  const templateId = params?.id;
  const searchParams = useSearchParams();
  const forkId = searchParams.get("fork");
  const isEdit = !!templateId;
  const isFork = !!forkId;
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameId, setGameId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [rules, setRules] = useState<TemplateRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit || isFork);

  useEffect(() => { listGames().then(d => setGames(d.games || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isGuest) { return; }

    const loadId = templateId || forkId;
    if (!loadId) return;

    if (isGuest && loadId.startsWith("guest-")) {
      const tpl = guestGetTemplate(loadId);
      if (tpl) { setName(isFork ? `${tpl.name} (copy)` : tpl.name); setDescription(tpl.description); setGameId(tpl.game_id || ""); setCells(tpl.cells || []); }
      setLoading(false);
    } else {
      getTemplate(loadId)
        .then((data) => {
          const tpl = data.template;
          setName(isFork ? `${tpl.name} (copy)` : tpl.name);
          setDescription(tpl.description || "");
          setGameId(tpl.game_id || "");
          setIsPublic(!!tpl.is_public);
          setCells(tpl.cells || []);
          setRules(tpl.rules || []);
        })
        .catch(() => toast.error("Template not found"))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, isGuest, isEdit, isFork, templateId, forkId, router]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error("Please enter a template name"); return; }
    setSaving(true);
    try {
      if (isGuest) {
        if (isEdit && templateId) {
          guestUpdateTemplate(templateId, { name, description, cells, rules });
          toast.success("Template updated! (saved locally)");
        } else {
          const tpl = guestSaveTemplate({ name, description, is_public: false, cells, rules });
          // Set game_id after creation
          if (gameId) guestUpdateTemplate(tpl.id, { name, description, cells, rules });
          toast.success("Template created! Sign in to save permanently.");
          router.push(`/scorecards/${tpl.id}`);
        }
      } else if (isEdit && templateId) {
        await updateTemplate(templateId, { name, description, game_id: gameId || undefined, is_public: isPublic, cells, rules });
        toast.success("Template updated!");
      } else {
        const result = await createTemplate({ name, description, game_id: gameId || undefined, is_public: isPublic, cells, rules });
        toast.success("Template created!");
        router.push(`/scorecards/${result.template.id}`);
      }
    } catch { toast.error("Failed to save template"); }
    finally { setSaving(false); }
  }, [name, description, isPublic, cells, rules, isEdit, templateId, router, isGuest]);

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link href="/scorecards" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-2 transition-colors">
            ← Scorecards
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEdit ? "Edit Scorecard" : "New Scorecard"}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={isEdit ? `/scorecards/${templateId}` : "/scorecards"} className="btn-secondary text-sm">Cancel</Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Scorecard"}
          </button>
        </div>
      </div>

      {/* Template metadata */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 tracking-wider block mb-1.5">Scorecard Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="input-field font-medium" placeholder="e.g. Poker Night, Team Match, Scrabble" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 tracking-wider block mb-1.5">Game (optional)</label>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)}
              className="input-field text-sm">
              <option value="">No game linked</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Public in gallery</span>
          </label>
        </div>
        <div className="mt-3">
          <label className="text-xs font-semibold text-slate-500 tracking-wider block mb-1.5">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="input-field" placeholder="Brief description of this scorecard layout" />
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Variations</h2><p className="mt-1 text-xs text-slate-500">Use variations for expansions, alternate rules, or optional score sections.</p></div><button type="button" onClick={() => setRules(current => [...current, { rule_key: `variation_${crypto.randomUUID().replaceAll("-", "")}`, label: "New variation", help_text: "", definition_json: { cells: [] }, sort_order: current.length }])} className="btn-secondary text-xs">Add variation</button></div>
        {rules.length === 0 ? <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">Create a variation, then choose it from a row’s “Show with variation” menu to make that row optional.</p> : <div className="mt-4 space-y-3">{rules.map((rule, index) => <div key={rule.rule_key} className="rounded-lg border border-slate-200 p-3"><div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="input-field text-sm" value={rule.label} placeholder="Variation name, e.g. Oceania expansion" onChange={event => setRules(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><input className="input-field text-sm" value={rule.help_text} placeholder="Brief explanation for players" onChange={event => setRules(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, help_text: event.target.value } : item))} /><button type="button" className="text-xs text-rose-600 hover:text-rose-700" onClick={() => { setRules(current => current.filter((_, itemIndex) => itemIndex !== index)); setCells(current => current.map(cell => (cell.config_json as Record<string, unknown>)?.rule_key === rule.rule_key ? { ...cell, config_json: { ...cell.config_json, rule_key: undefined } } : cell)); }}>Remove</button></div><p className="mt-2 text-[11px] text-slate-500">Assign score rows to this variation from their “Show with variation” menu.</p></div>)}</div>}
      </div>

      {/* Grid Builder */}
      <div className="mt-6">
        <GridBuilder cells={cells} modules={rules} onChange={setCells} />
      </div>
    </div>
  );
}
