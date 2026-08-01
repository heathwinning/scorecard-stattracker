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
import { guestGetScorecard, guestUpdateScorecard, guestDeleteScorecard, guestGetTemplate, guestFindByShareCode, guestDeleteCellValue } from "@/lib/guest-store";
import ScorecardGrid, { type SaveState } from "@/components/ScorecardGrid";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiOutlineCog, HiOutlineClipboardCopy, HiOutlineShare, HiOutlineTrash, HiOutlineLockClosed } from "react-icons/hi";

export default function ScorecardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const id = params.id as string;

  const [scorecardId, setScorecardId] = useState<string>(id);
  const [cells, setCells] = useState<TemplateCell[]>([]);
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [values, setValues] = useState<CellValue[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [scorecardTitle, setScorecardTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [gameDate, setGameDate] = useState("");
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [myPlayerSlotId, setMyPlayerSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ScorecardParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [liveMode, setLiveMode] = useState(false);
  const [gameMode, setGameMode] = useState<"shared" | "live">("shared");
  const [hostOnlyEditing, setHostOnlyEditing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [privatePlayerScores, setPrivatePlayerScores] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastUpdatedRef = useRef<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const metadataPersistTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const cellFlushTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingCellsRef = useRef(new Map<string, {
    template_cell_id: string; player_id: string; entry_key: string; value: string; is_hidden: number;
  }>());
  const playersRef = useRef(players);
  const valuesRef = useRef(values);
  const participantsRef = useRef(participants);
  const scorecardTitleRef = useRef(scorecardTitle);
  const liveModeRef = useRef(liveMode);
  const isOwnerRef = useRef(isOwner);
  const shareCodeRef = useRef(shareCode);
  const editingPlayerNameRef = useRef(false);
  playersRef.current = players;
  valuesRef.current = values;
  participantsRef.current = participants;
  scorecardTitleRef.current = scorecardTitle;
  liveModeRef.current = liveMode;
  isOwnerRef.current = isOwner;
  shareCodeRef.current = shareCode;

  // Wrapper that keeps valuesRef in sync (needed because persist() reads the ref
  // before React flushes state updates from setValues)
  const handleValuesChange = useCallback((newValues: CellValue[]) => {
    valuesRef.current = newValues;
    setValues(newValues);
  }, []);

  const handlePlayersChange = useCallback((newPlayers: ScorecardPlayer[]) => {
    playersRef.current = newPlayers;
    setPlayers(newPlayers);
  }, []);

  const handlePlayerNameEditingChange = useCallback((editing: boolean) => {
    editingPlayerNameRef.current = editing;
  }, []);

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
      setTemplateId(data.scorecard.template_id);
      setTemplateName(data.scorecard.template_name || "Game");
      setScorecardTitle(data.scorecard.title || "");
      setGameDate(data.scorecard.game_date || "");
      setShareCode(data.scorecard.share_code || null);
      setHostOnlyEditing(data.scorecard.host_only_editing === 1);
      setIsLocked(data.scorecard.is_locked === 1);
      setPrivatePlayerScores(data.scorecard.private_player_scores === 1);
      setIsOwner(true);
      // If template name is missing, look it up
      if (!data.scorecard.template_name && data.scorecard.template_id) {
        if (data.scorecard.template_id.startsWith("guest-")) {
          const tpl = guestGetTemplate(data.scorecard.template_id);
          if (tpl) setTemplateName(tpl.name);
        } else {
          getTemplate(data.scorecard.template_id)
            .then(tplData => setTemplateName(tplData.template.name))
            .catch(() => {});
        }
      }
      if (data.cells?.length) {
        setCells(data.cells);
      } else if (data.scorecard.template_id.startsWith("guest-")) {
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
        setTemplateId(data.scorecard.template_id);
        setTemplateName(data.scorecard.template_name || "Game");
        setScorecardTitle(data.scorecard.title || "");
        setGameDate(data.scorecard.game_date || "");
        setShareCode(data.scorecard.share_code || null);
        setGameMode(data.scorecard.sharing_mode === "slots" ? "live" : "shared");
        setHostOnlyEditing(data.scorecard.host_only_editing === 1);
        setIsLocked(data.scorecard.is_locked === 1);
        setPrivatePlayerScores(data.scorecard.private_player_scores === 1);
        setIsOwner(user?.id === data.scorecard.created_by);

        if (data.cells?.length) setCells(data.cells);
        else {
          const tplData = await getTemplate(data.scorecard.template_id);
          setCells(tplData.template.cells || []);
        }

        if (data.scorecard.share_code && user) {
          try {
            const live = await getLiveScorecard(data.scorecard.id);
            participantsRef.current = live.participants || [];
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

  // Live polling. CellInput keeps its own value while focused, so remote
  // changes can be applied to the rest of the table without stealing focus.
  const doPoll = useCallback(async () => {
    if (!liveMode || !scorecardId) return;
    // Merge remote data per-cell. Only the cell currently being edited (and
    // any cells with in-flight local saves) are protected — the rest of the
    // table stays live even while the user types.
    const activeInput = document.activeElement;
    const focusedCellKey = activeInput instanceof HTMLInputElement ? activeInput.getAttribute("data-cell-key") : null;
    try {
      const live = await getLiveScorecard(scorecardId, lastUpdatedRef.current);

      // Collaboration mode is host-owned metadata. Apply it from the same
      // live response as players/values so every participant changes behavior
      // immediately when the host switches between Shared and Player Slots.
      const remoteMode = live.scorecard.sharing_mode === "slots" ? "live" : "shared";
      setGameMode(current => current === remoteMode ? current : remoteMode);
      setHostOnlyEditing(live.scorecard.host_only_editing === 1);
      setIsLocked(live.scorecard.is_locked === 1);
      setPrivatePlayerScores(live.scorecard.private_player_scores === 1);

      if (live.values?.length) {
        setValues((prev) => {
          const map = new Map(prev.map(v => [`${v.template_cell_id}:${v.player_id}:${v.entry_key || ''}`, v]));
          let changed = false;
          for (const v of live.values) {
            const key = `${v.template_cell_id}:${v.player_id}:${v.entry_key || ''}`;
            // Do not let an in-flight local edit be replaced by the poll response.
            // This also protects against a response that started before the save
            // request reached D1.
            if (pendingCellsRef.current.has(key)) continue;
            // Never clobber the cell the user is actively editing.
            if (focusedCellKey === key) continue;
            const existing = map.get(key);
            if (!existing || existing.value !== v.value || existing.is_hidden !== v.is_hidden) {
              map.set(key, v);
              changed = true;
            }
          }
          const next = changed ? Array.from(map.values()) : prev;
          valuesRef.current = next;
          return next;
        });
      }
      if (live.participants) {
        const sameParticipants = participantsRef.current.length === live.participants.length && live.participants.every((remote: ScorecardParticipant, index: number) => {
          const local = participantsRef.current[index];
          return local?.id === remote.id && local.user_id === remote.user_id && local.player_slot_id === remote.player_slot_id && local.role === remote.role;
        });
        if (!sameParticipants) {
          participantsRef.current = live.participants;
          setParticipants(live.participants);
        }
      }
      const activePlayerInput = document.activeElement;
      if (!editingPlayerNameRef.current && (!(activePlayerInput instanceof HTMLInputElement) || !activePlayerInput.hasAttribute("data-player-name-input"))) {
        if (live.players) {
          const samePlayers = playersRef.current.length === live.players.length && live.players.every((remote: ScorecardPlayer, index: number) => {
            const local = playersRef.current[index];
            return local?.id === remote.id && local.player_name === remote.player_name && local.sort_order === remote.sort_order;
          });
          if (!samePlayers) {
            playersRef.current = live.players;
            setPlayers(live.players);
          }
        }
      }
      const active = document.activeElement;
      if (!(active instanceof HTMLInputElement) || !active.hasAttribute("data-scorecard-title")) {
        const remoteTitle = live.scorecard.title || "";
        if (remoteTitle !== scorecardTitleRef.current) {
          scorecardTitleRef.current = remoteTitle;
          setScorecardTitle(remoteTitle);
        }
      }
      lastUpdatedRef.current = live.last_updated;
    } catch { /* ignore poll errors */ }
  }, [liveMode, scorecardId]);

  useEffect(() => {
    if (!liveMode || !scorecardId) return;
    pollRef.current = setInterval(() => { doPoll(); }, 3000);
    return () => clearInterval(pollRef.current);
  }, [liveMode, scorecardId, doPoll]);

  const handleCellUpdate = useCallback(async (
    cellId: string, playerId: string, value: string, isHidden: number, entryKey?: string
  ) => {
    const ek = entryKey || '';
    const newCell: CellValue = { template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden };
    // Update ref immediately so persist() sees the latest value (before React batch flush)
    const prevValues = valuesRef.current;
    const existingIdx = prevValues.findIndex(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek);
    valuesRef.current = existingIdx >= 0
      ? [...prevValues.slice(0, existingIdx), newCell, ...prevValues.slice(existingIdx + 1)]
      : [...prevValues, newCell];
    // Also update React state
    setValues((prev) => {
      const existing = prev.find(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek);
      if (existing) return prev.map(v => v.template_cell_id === cellId && v.player_id === playerId && (v.entry_key || '') === ek ? { ...v, value, is_hidden: isHidden } : v);
      return [...prev, { template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }];
    });
    if (scorecardId.startsWith("guest-")) {
      guestUpdateScorecard(scorecardId, { values: [{ template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden }] } as any);
      setSaveState("saved");
    } else {
      pendingCellsRef.current.set(`${cellId}:${playerId}:${ek}`, {
        template_cell_id: cellId, player_id: playerId, entry_key: ek, value, is_hidden: isHidden,
      });
      setSaveState("saving");
      if (cellFlushTimerRef.current) clearTimeout(cellFlushTimerRef.current);
      cellFlushTimerRef.current = setTimeout(async () => {
        const cells = Array.from(pendingCellsRef.current.values());
        if (!cells.length) return;
        try {
          await updateMyCells(scorecardId, cells);
          for (const cell of cells) {
            const key = `${cell.template_cell_id}:${cell.player_id}:${cell.entry_key || ''}`;
            const current = pendingCellsRef.current.get(key);
            if (current === cell) pendingCellsRef.current.delete(key);
          }
          setSaveState(pendingCellsRef.current.size ? "saving" : "saved");
        } catch { setSaveState("error"); }
      }, 300);
    }
  }, [scorecardId]);

  const handleCellDelete = useCallback(async (cellId: string, playerId: string, entryKey: string) => {
    // The grid already removed the value from local state via onValuesChange.
    pendingCellsRef.current.delete(`${cellId}:${playerId}:${entryKey}`);
    if (scorecardId.startsWith("guest-")) {
      guestDeleteCellValue(scorecardId, cellId, playerId || null, entryKey);
      return;
    }
    try {
      await updateMyCells(scorecardId, [], [{ template_cell_id: cellId, player_id: playerId, entry_key: entryKey }]);
    } catch { setSaveState("error"); }
  }, [scorecardId]);

  // Ensure either collaboration mode has a joinable link.
  useEffect(() => {
    if (loading || shareCode || scorecardId.startsWith("guest-")) return;
    fetch(`/api/scores/${scorecardId}/share`, { method: "POST" })
      .then(r => r.json())
      .then(data => { if (data.share_code) setShareCode(data.share_code); })
      .catch(() => {});
  }, [gameMode, loading, shareCode, scorecardId]);

  const handleGameModeChange = useCallback(async (mode: "shared" | "live") => {
    setGameMode(mode);
    const sharingMode = mode === "live" ? "slots" : "shared";
    if (scorecardId.startsWith("guest-")) {
      guestUpdateScorecard(scorecardId, { sharing_mode: sharingMode } as any);
      return;
    }
    try {
      await updateScorecard(scorecardId, { sharing_mode: sharingMode });
    } catch {
      toast.error("Could not update collaboration mode");
    }
  }, [scorecardId]);

  const updateEditingSettings = useCallback(async (nextHostOnlyEditing: boolean, nextIsLocked: boolean, nextPrivatePlayerScores: boolean) => {
    const previousHostOnlyEditing = hostOnlyEditing;
    const previousIsLocked = isLocked;
    const previousPrivatePlayerScores = privatePlayerScores;
    setHostOnlyEditing(nextHostOnlyEditing);
    setIsLocked(nextIsLocked);
    setPrivatePlayerScores(nextPrivatePlayerScores);

    try {
      if (scorecardId.startsWith("guest-")) {
        guestUpdateScorecard(scorecardId, {
          host_only_editing: nextHostOnlyEditing,
          is_locked: nextIsLocked,
          private_player_scores: nextPrivatePlayerScores,
        } as any);
      } else {
        await updateScorecard(scorecardId, {
          host_only_editing: nextHostOnlyEditing,
          is_locked: nextIsLocked,
          private_player_scores: nextPrivatePlayerScores,
        });
      }
    } catch {
      setHostOnlyEditing(previousHostOnlyEditing);
      setIsLocked(previousIsLocked);
      setPrivatePlayerScores(previousPrivatePlayerScores);
      toast.error("Could not update editing settings");
    }
  }, [hostOnlyEditing, isLocked, privatePlayerScores, scorecardId]);

  const persistMetadata = useCallback(async () => {
    if (liveModeRef.current && !isOwnerRef.current) return;
    if (metadataPersistTimerRef.current) clearTimeout(metadataPersistTimerRef.current);
    metadataPersistTimerRef.current = setTimeout(async () => {
      const latestPlayers = playersRef.current;
      const latestTitle = scorecardTitleRef.current;
      if (scorecardId.startsWith("guest-")) {
        guestUpdateScorecard(scorecardId, { title: latestTitle, players: latestPlayers } as any);
      } else {
        try {
          // Metadata is deliberately separate from score values. This request is
          // safe in live mode and cannot overwrite another player's score.
          await updateScorecard(scorecardId, { title: latestTitle, players: latestPlayers });
        } catch { /* silent */ }
      }
    }, 250);
  }, [scorecardId, liveMode, isOwner]);

  const handleDelete = async () => {
    try {
      if (scorecardId.startsWith("guest-")) { guestDeleteScorecard(scorecardId); }
      else { await deleteScorecard(scorecardId); }
      toast.success("Deleted"); router.push("/scores");
    } catch { toast.error("Failed to delete"); }
  };

  const isReadOnly = isLocked || (hostOnlyEditing && !isOwner) || (!isOwner && gameMode === "live" && !myPlayerSlotId);
  const readOnlyMessage = isLocked
    ? "This completed scorecard is locked. No one can edit it until the host unlocks it."
    : hostOnlyEditing && !isOwner
      ? "Only the host can edit this scorecard. You can view scores as they are updated."
      : "Choose a player slot to enter scores.";

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
    <div className="max-w-6xl mx-auto px-4 pb-6 pt-3 sm:pt-4 page-enter">
      {/* Top bar: game name + share code + settings */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="basis-full min-w-0 sm:flex-1 sm:basis-auto">
          <Link href="/scores" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-0.5 transition-colors">
            ← My Scores
          </Link>
          <h1 className="min-w-0 text-lg font-bold tracking-tight text-slate-900 truncate">
            {isOwner ? (
              <input
                value={scorecardTitle}
                placeholder={templateName}
                data-scorecard-title=""
                onChange={e => { scorecardTitleRef.current = e.target.value; setScorecardTitle(e.target.value); persistMetadata(); }}
                className="bg-transparent outline-none border-b border-transparent focus:border-indigo-300 w-full max-w-xs"
              />
            ) : (scorecardTitle || templateName)}
          </h1>
          {gameDate && <p className="mt-0.5 text-sm font-normal text-slate-400">{new Date(gameDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
          {isLocked && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><HiOutlineLockClosed className="h-3.5 w-3.5" /> Locked</span>}
          {templateId && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <Link href={`/scorecards/${templateId}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                View scorecard
              </Link>
              <Link href={`/history/new?template=${encodeURIComponent(templateId)}`} className="text-indigo-600 hover:text-indigo-800 hover:underline">
                New game with this scorecard
              </Link>
            </div>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
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
      {isReadOnly && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <HiOutlineLockClosed className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{readOnlyMessage}</p>
        </div>
      )}
      {cells.length > 0 && (
        <ScorecardGrid
          cells={cells}
          players={players}
          values={values}
          onPlayersChange={handlePlayersChange}
          onValuesChange={handleValuesChange}
          readOnly={isReadOnly}
          myPlayerSlotId={gameMode === "live" ? myPlayerSlotId : undefined}
          isOwner={isOwner}
          isLive={liveMode}
          privatePlayerScores={privatePlayerScores}
          onCellUpdate={handleCellUpdate}
          onCellDelete={handleCellDelete}
          onMetadataPersist={persistMetadata}
          onPlayerNameEditingChange={handlePlayerNameEditingChange}
          onFlushPoll={doPoll}
          saveState={saveState}
        />
      )}

      {/* Settings Modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Game Settings">
        <div className="space-y-6">
          {/* Game Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-500 tracking-wider block mb-2">Game Mode</label>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => handleGameModeChange("shared")}
                className={`flex-1 text-xs font-medium px-3 py-2 rounded-md transition-all ${gameMode === "shared" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Shared
              </button>
              <button
                onClick={() => handleGameModeChange("live")}
                className={`flex-1 text-xs font-medium px-3 py-2 rounded-md transition-all ${gameMode === "live" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Player Slots
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {gameMode === "shared"
                ? "Everyone with the link sees the same scorecard and can edit everything."
                : "Each player joins via link, picks a slot, and only edits their own scores."}
            </p>
          </div>

          {isOwner && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Host-only editing</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Only you can edit scores. Guests can still view the shared scorecard.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hostOnlyEditing}
                    onClick={() => updateEditingSettings(!hostOnlyEditing, isLocked, privatePlayerScores)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${hostOnlyEditing ? "bg-indigo-600" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${hostOnlyEditing ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Private player scores</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">In Player Slots mode, players can only view and edit their own scores. You can still see every score.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={privatePlayerScores}
                    aria-disabled={gameMode !== "live"}
                    disabled={gameMode !== "live"}
                    onClick={() => updateEditingSettings(hostOnlyEditing, isLocked, !privatePlayerScores)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${privatePlayerScores ? "bg-indigo-600" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${privatePlayerScores ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                {gameMode !== "live" && <p className="mt-3 text-xs text-slate-400">Switch to Player Slots to enable this.</p>}
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Lock scorecard</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Prevent everyone, including you, from changing completed scores until you unlock it.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isLocked}
                    onClick={() => updateEditingSettings(hostOnlyEditing, !isLocked, privatePlayerScores)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${isLocked ? "bg-rose-600" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${isLocked ? "left-6" : "left-1"}`} />
                  </button>
                </div>
                {isLocked && <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600"><HiOutlineLockClosed className="h-3.5 w-3.5" /> Scorecard locked</p>}
              </div>

              <button onClick={() => { setSettingsOpen(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg px-4 py-2.5 transition-colors">
                <HiOutlineTrash className="w-4 h-4" />
                Delete Scorecard
              </button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Scorecard"
        message="Delete this scorecard permanently? This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
