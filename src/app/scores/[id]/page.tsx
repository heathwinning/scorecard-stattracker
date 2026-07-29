"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getScorecard, getTemplate, updateScorecard, deleteScorecard,
  getLiveScorecard, updateMyCells,
  type TemplateCell, type ScorecardPlayer, type CellValue, type ScorecardParticipant,
} from "@/lib/api-client";
import { guestGetScorecard, guestUpdateScorecard, guestDeleteScorecard, guestGetTemplate, guestFindByShareCode } from "@/lib/guest-store";
import ScorecardFill from "@/components/ScorecardFill";
import Modal from "@/components/Modal";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiOutlineCog, HiOutlineClipboardCopy, HiOutlineShare, HiOutlineTrash } from "react-icons/hi";

export default function ScorecardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const id = params.id as string;

  const [scorecardId, setScorecardId] = useState<string>(id);
  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [values, setValues] = useState<CellValue[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [myPlayerSlotId, setMyPlayerSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ScorecardParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastUpdatedRef = useRef<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Initial load
  useEffect(() => {
    // Resolve share code to guest scorecard ID
    let resolvedId = id;
    if (id.startsWith("guest-")) {
      // Direct guest ID
    } else if (id.length <= 10 && !id.includes("-")) {
      // Looks like a share code — try guest store
      const guestSc = guestFindByShareCode(id);
      if (guestSc) resolvedId = guestSc.id;
    }

    if (resolvedId.startsWith("guest-")) {
      setScorecardId(resolvedId);
      const data = guestGetScorecard(resolvedId);
      if (!data) { toast.error("Scorecard not found"); setLoading(false); return; }
      setPlayers(data.players || []);
      setValues(data.values || []);
      setTemplateName(data.scorecard.template_name || "Game");
      setShareCode(data.scorecard.share_code || null);
      setIsOwner(true);
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

    getScorecard(resolvedId)
      .then(async (data) => {
        setScorecardId(data.scorecard.id);
        setPlayers(data.players || []);
        setValues(data.values || []);
        setTemplateName(data.scorecard.template_name || "Game");
        setShareCode(data.scorecard.share_code || null);
        setIsOwner(user?.id === data.scorecard.created_by);

        const tplData = await getTemplate(data.scorecard.template_id);
        setCells(tplData.template.cells || []);

        if (data.scorecard.share_code && user) {
          try {
            const live = await getLiveScorecard(scorecardId);
            setParticipants(live.participants || []);
            lastUpdatedRef.current = live.last_updated;
            const me = live.participants.find((p: ScorecardParticipant) => p.user_id === user.id);
            if (me) {
              setMyPlayerSlotId(me.player_slot_id);
              setLiveMode(true);
              if (live.values?.length) setValues(live.values);
            }
          } catch { /* not a participant */ }
        }
      })
      .catch(() => toast.error("Scorecard not found"))
      .finally(() => setLoading(false));
  }, [id, user, scorecardId]);

  // Live polling
  useEffect(() => {
    if (!liveMode) return;

    pollRef.current = setInterval(async () => {
      try {
        const live = await getLiveScorecard(scorecardId, lastUpdatedRef.current);
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
  }, [liveMode, scorecardId]);

  const handleCellUpdate = useCallback(async (
    cellId: string, playerId: string, value: string, isHidden: number, entryKey?: string
  ) => {
    const ek = entryKey || '';
    setValues((prev) => {
      const existing = prev.find(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek);
      if (existing) return prev.map(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek ? { ...v, value, is_hidden: isHidden } : v);
      return [...prev, { template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }];
    });
    if (scorecardId.startsWith("guest-")) {
      guestUpdateScorecard(scorecardId, { values: [{ template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }] } as any);
    } else {
      try { await updateMyCells(scorecardId, [{ template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }]); }
      catch { toast.error("Failed to save"); }
    }
  }, [scorecardId]);

  const persist = useCallback(async () => {
    if (scorecardId.startsWith("guest-")) {
      guestUpdateScorecard(scorecardId, { players, values } as any);
    } else {
      try { await updateScorecard(scorecardId, { players, values }); } catch { /* silent */ }
    }
  }, [scorecardId, players, values]);

  const handleDelete = async () => {
    if (!confirm("Delete this scorecard permanently?")) return;
    try {
      if (scorecardId.startsWith("guest-")) { guestDeleteScorecard(scorecardId); }
      else { await deleteScorecard(scorecardId); }
      toast.success("Deleted"); router.push("/scores");
    } catch { toast.error("Failed to delete"); }
  };

  const copyLink = async () => {
    const joinUrl = `${window.location.origin}/join/${shareCode}`;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 page-enter">
      {/* Top bar: game name + share code + settings */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link href="/scores" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-0.5 transition-colors">
            ← My Scores
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 truncate">{templateName}</h1>
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

      {/* Scorecard table */}
      {cells.length > 0 && (
        <ScorecardFill
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={setPlayers}
          onValuesChange={setValues}
          readOnly={!(isOwner || !!myPlayerSlotId)}
          myPlayerSlotId={liveMode ? myPlayerSlotId : undefined}
          isOwner={isOwner}
          onCellUpdate={liveMode ? handleCellUpdate : undefined}
          onPersist={!liveMode ? persist : undefined}
        />
      )}

      {/* Timestamp */}
      {!loading && (
        <p className="text-[11px] text-slate-400 text-right mt-4">
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Game Settings">
        <div className="space-y-4">
          {isOwner && (
            <button onClick={() => { setSettingsOpen(false); handleDelete(); }}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg px-4 py-2.5 transition-colors">
              <HiOutlineTrash className="w-4 h-4" />
              Delete Scorecard
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}
