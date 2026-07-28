"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createTemplate, updateTemplate, getTemplate, listGames, type TemplateCell, type Game } from "@/lib/api-client";
import { guestSaveTemplate, guestUpdateTemplate, guestGetTemplate } from "@/lib/guest-store";
import GridBuilder from "@/components/GridBuilder";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props { params?: { id?: string }; }

export default function TemplateNewPage({ params }: Props) {
  const templateId = params?.id;
  const isEdit = !!templateId;
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameId, setGameId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => { listGames().then(d => setGames(d.games || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !isGuest) { return; }

    if (isEdit && templateId) {
      if (isGuest && templateId.startsWith("guest-")) {
        const tpl = guestGetTemplate(templateId);
        if (tpl) { setName(tpl.name); setDescription(tpl.description); setGameId(tpl.game_id || ""); setCells(tpl.cells || []); }
        setLoading(false);
      } else {
        getTemplate(templateId)
          .then((data) => {
            const tpl = data.template;
            setName(tpl.name);
            setDescription(tpl.description || "");
            setGameId(tpl.game_id || "");
            setIsPublic(!!tpl.is_public);
            setCells(tpl.cells || []);
          })
          .catch(() => toast.error("Template not found"))
          .finally(() => setLoading(false));
      }
    }
  }, [user, authLoading, isGuest, isEdit, templateId, router]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error("Please enter a template name"); return; }
    setSaving(true);
    try {
      if (isGuest) {
        if (isEdit && templateId) {
          guestUpdateTemplate(templateId, { name, description, cells });
          toast.success("Template updated! (saved locally)");
        } else {
          const tpl = guestSaveTemplate({ name, description, is_public: false, cells });
          // Set game_id after creation
          if (gameId) guestUpdateTemplate(tpl.id, { name, description, cells });
          toast.success("Template created! Sign in to save permanently.");
          router.push(`/templates/${tpl.id}`);
        }
      } else if (isEdit && templateId) {
        await updateTemplate(templateId, { name, description, game_id: gameId || undefined, is_public: isPublic, cells });
        toast.success("Template updated!");
      } else {
        const result = await createTemplate({ name, description, game_id: gameId || undefined, is_public: isPublic, cells });
        toast.success("Template created!");
        router.push(`/templates/${result.template.id}`);
      }
    } catch { toast.error("Failed to save template"); }
    finally { setSaving(false); }
  }, [name, description, isPublic, cells, isEdit, templateId, router, isGuest]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-2 transition-colors">
            ← Templates
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEdit ? "Edit Scorecard" : "New Scorecard"}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={isEdit ? `/templates/${templateId}` : "/templates"} className="btn-secondary text-sm">Cancel</Link>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Scorecard"}
          </button>
        </div>
      </div>

      {/* Template metadata */}
      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Scorecard Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="input-field font-medium" placeholder="e.g. Poker Night, Team Match, Scrabble" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Game (optional)</label>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)}
              className="input-field text-sm">
              <option value="">No game linked</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Description (optional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="input-field" placeholder="Brief description of this scorecard layout" />
        </div>
      </div>

      {/* Grid Builder */}
      <GridBuilder cells={cells} onChange={setCells} />
    </div>
  );
}
