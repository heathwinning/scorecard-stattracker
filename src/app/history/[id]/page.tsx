"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getScorecard, getTemplate, updateScorecard, deleteScorecard,
  getLiveScorecard, updateMyCells,
  type TemplateCell, type ScorecardPlayer, type CellValue, type ScorecardParticipant,
} from "@/lib/api-client";import { guestGetScorecard, guestUpdateScorecard, guestDeleteScorecard, guestGetTemplate } from "@/lib/guest-store";import ScorecardFill from "@/components/ScorecardFill";
import ShareModal from "@/components/ShareModal";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiOutlineShare, HiOutlineUsers } from "react-icons/hi";

export default function ScorecardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const id = params.id as string;

  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [values, setValues] = useState<CellValue[]>([]);
  const [title, setTitle] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [myPlayerSlotId, setMyPlayerSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ScorecardParticipant[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const lastUpdatedRef = useRef<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Initial load
  useEffect(() => {
    if (id.startsWith("guest-")) {
      const data = guestGetScorecard(id);
      if (!data) { toast.error("Scorecard not found"); setLoading(false); return; }
      setPlayers(data.players || []);
      setValues(data.values || []);
      setTitle(data.scorecard.title || "");
      setGameDate(data.scorecard.game_date || "");
      setTemplateName(data.scorecard.template_name || "");
      setIsOwner(true); // Guest owns their own data
      // Load template cells
      if (data.scorecard.template_id.startsWith("guest-")) {
        const tpl = guestGetTemplate(data.scorecard.template_id);
        if (tpl) setCells(tpl.cells || []);
      } else {
        getTemplate(data.scorecard.template_id)
          .then((tplData) => setCells(tplData.template.cells || []))
          .finally(() => setLoading(false));
        return;
      }
      setLoading(false);
      return;
    }

    getScorecard(id)
      .then(async (data) => {
        setPlayers(data.players || []);
        setValues(data.values || []);
        setTitle(data.scorecard.title || "");
        setGameDate(data.scorecard.game_date || "");
        setTemplateName(data.scorecard.template_name);
        setShareCode(data.scorecard.share_code || null);
        const isOwnerCheck = user?.id === data.scorecard.created_by || (isGuest && data.scorecard.created_by === "guest");
        setIsOwner(isOwnerCheck);

        const tplData = await getTemplate(data.scorecard.template_id);
        setCells(tplData.template.cells || []);

        // If shared, try live endpoint to check participation
        if (data.scorecard.share_code && user) {
          try {
            const live = await getLiveScorecard(id);
            setParticipants(live.participants || []);
            lastUpdatedRef.current = live.last_updated;
            const me = live.participants.find((p: ScorecardParticipant) => p.user_id === user.id);
            if (me) {
              setIsParticipant(true);
              setMyPlayerSlotId(me.player_slot_id);
              setLiveMode(true);
              // Merge live values
              if (live.values?.length) setValues(live.values);
            }
          } catch { /* not a participant */ }
        }
      })
      .catch(() => toast.error("Scorecard not found"))
      .finally(() => setLoading(false));
  }, [id, user]);

  // Live polling
  useEffect(() => {
    if (!liveMode) return;

    pollRef.current = setInterval(async () => {
      try {
        const live = await getLiveScorecard(id, lastUpdatedRef.current);
        if (live.values?.length) {
          setValues((prev) => {
            const map = new Map(prev.map(v => [`${v.template_cell_id}:${v.player_id}`, v]));
            for (const v of live.values) {
              map.set(`${v.template_cell_id}:${v.player_id}`, v);
            }
            return Array.from(map.values());
          });
        }
        if (live.participants) setParticipants(live.participants);
        lastUpdatedRef.current = live.last_updated;
      } catch { /* ignore poll errors */ }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [liveMode, id]);

  const handleCellUpdate = useCallback(async (
    cellId: string, playerId: string, value: string, isHidden: number, entryKey?: string
  ) => {
    const ek = entryKey || '';
    setValues((prev) => {
      const existing = prev.find(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek);
      if (existing) return prev.map(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek ? { ...v, value, is_hidden: isHidden } : v);
      return [...prev, { template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }];
    });
    if (id.startsWith("guest-")) {
      guestUpdateScorecard(id, { values: [{ template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }] });
    } else {
      try { await updateMyCells(id, [{ template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }]); }
      catch { toast.error("Failed to save"); }
    }
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this scorecard?")) return;
    try {
      if (id.startsWith("guest-")) { guestDeleteScorecard(id); }
      else { await deleteScorecard(id); }
      toast.success("Deleted"); router.push("/history");
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-6 w-24 bg-slate-200 rounded" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const canEditScorecard = isOwner && !liveMode;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Link href="/history" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-1 transition-colors">
            ← Scorecards
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title || "Untitled Game"}</h1>
            {liveMode && (
              <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">Template: {templateName} · {gameDate}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Share button */}
          {isOwner && (
            <button onClick={() => setShowShare(true)} className="btn-secondary text-sm">
              <HiOutlineShare className="w-4 h-4" />
              {shareCode ? "Shared" : "Share"}
            </button>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div className="flex items-center -space-x-2">
              {participants.slice(0, 4).map((p) => (
                <div key={p.id} title={p.user_name || p.user_id}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  {(p.user_name || "?")[0].toUpperCase()}
                </div>
              ))}
              {participants.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
                  +{participants.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Edit/Delete for owner in non-live mode */}
          {canEditScorecard && !editing && (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit</button>
              <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={async () => {
                setSaving(true);
                try {
                  if (id.startsWith("guest-")) {
                    guestUpdateScorecard(id, { title, game_date: gameDate, players, values });
                  } else {
                    await updateScorecard(id, { title, game_date: gameDate, players, values });
                  }
                  toast.success("Saved!"); setEditing(false);
                } catch { toast.error("Failed"); }
                finally { setSaving(false); }
              }} disabled={saving} className="btn-primary text-sm">
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="card p-5 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Date</label>
            <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} className="input-field" />
          </div>
        </div>
      )}

      {cells.length > 0 && (
        <ScorecardFill
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={setPlayers}
          onValuesChange={setValues}
          readOnly={!editing && !liveMode}
          myPlayerSlotId={liveMode ? myPlayerSlotId : undefined}
          isOwner={isOwner}
          onCellUpdate={liveMode ? handleCellUpdate : undefined}
        />
      )}

      {showShare && (
        <ShareModal
          scorecardId={id}
          shareCode={shareCode}
          isGuest={isGuest}
          onClose={() => setShowShare(false)}
          onShared={(code) => setShareCode(code)}
        />
      )}
    </div>
  );
}
