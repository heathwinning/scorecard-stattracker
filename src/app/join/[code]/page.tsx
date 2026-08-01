"use client";

export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { joinScorecard, type ScorecardPlayer } from "@/lib/api-client";
import { guestFindByShareCode, guestGetScorecard } from "@/lib/guest-store";
import Link from "next/link";
import toast from "react-hot-toast";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const code = (params.code as string)?.toUpperCase() || "";

  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [gameName, setGameName] = useState("Scorecard");
  const [sharingMode, setSharingMode] = useState<"shared" | "slots">("shared");
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [playerSlotId, setPlayerSlotId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (authLoading) return;
      if (!user && !isGuest) { router.push(`/login?redirect=/join/${code}`); return; }
      if (!code) { setError("No code provided"); setLoading(false); return; }

      const guestSc = guestFindByShareCode(code);
      if (guestSc) {
        const guestData = guestGetScorecard(guestSc.id);
        setScorecardId(guestSc.id);
        setGameName(guestSc.title || guestSc.template_name || "Scorecard");
        setSharingMode(guestSc.sharing_mode === "slots" ? "slots" : "shared");
        setPlayers(guestData?.players || []);
        setLoading(false);
        return;
      }

      try {
        // This also registers the visitor as a participant. For shared games,
        // that is all that is needed; slots mode continues to the seat picker.
        const result = await joinScorecard(code);
        setScorecardId(result.scorecard_id);
        setGameName(result.game_name || "Scorecard");
        setSharingMode(result.sharing_mode);
        setPlayers(result.players || []);
        setTakenSlots(result.taken_slot_ids || []);
        if (result.player_slot_id) {
          setPlayerSlotId(result.player_slot_id);
          setPlayerName(result.player_name);
        }
      } catch (err: any) {
        setError(err.message || "Invalid or expired share code");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, isGuest, authLoading, code, router]);

  const claimSeat = useCallback(async (seat: ScorecardPlayer) => {
    if (!scorecardId || !code || !seat.id) return;
    setJoining(true);
    try {
      if (isGuest || scorecardId.startsWith("guest-")) {
        // Guest scorecards are local-only; use the existing seat in this tab.
        setPlayerSlotId(seat.id);
        setPlayerName(customName.trim() || seat.player_name);
      } else {
        const result = await joinScorecard(code, { playerSlotId: seat.id, playerName: customName.trim() || undefined });
        setPlayerSlotId(result.player_slot_id);
        setPlayerName(result.player_name);
        setTakenSlots(result.taken_slot_ids || []);
      }
      toast.success("Seat claimed!");
    } catch (err: any) {
      toast.error(err.message || "Could not claim that seat");
    } finally {
      setJoining(false);
    }
  }, [scorecardId, code, customName, isGuest]);

  const goToScorecard = () => router.push(`/scores/${code}`);

  if (authLoading || loading) return <div className="max-w-md mx-auto px-4 py-20 animate-pulse"><div className="h-8 w-32 bg-slate-200 rounded mb-4" /><div className="h-32 bg-slate-100 rounded-2xl" /></div>;
  if (error) return <div className="max-w-md mx-auto px-4 py-20 text-center"><div className="empty-state-icon mx-auto mb-4">🔗</div><h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1><p className="text-sm text-slate-500 mb-4">{error}</p><Link href="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link></div>;

  if (sharingMode === "shared") {
    return <div className="max-w-md mx-auto px-4 py-20 text-center page-enter"><div className="empty-state-icon mx-auto mb-4">🤝</div><p className="text-sm font-semibold text-indigo-600 mb-2">{gameName}</p><h1 className="text-xl font-bold text-slate-900 mb-2">Shared Scorecard</h1><p className="text-sm text-slate-500 mb-6">You’re in. Everyone with this link can enter and update all scores together.</p><button onClick={goToScorecard} className="btn-primary">Open Scorecard</button></div>;
  }

  if (playerSlotId && playerName) {
    return <div className="max-w-md mx-auto px-4 py-20 text-center page-enter"><div className="empty-state-icon mx-auto mb-4">✅</div><h1 className="text-xl font-bold text-slate-900 mb-2">Seat claimed</h1><p className="text-sm text-slate-500 mb-2">Playing as <strong>{playerName}</strong></p><p className="text-xs text-slate-400 mb-6">You can now enter scores for your seat only.</p><button onClick={goToScorecard} className="btn-primary">Open Scorecard</button></div>;
  }

  const availableSeats = players.filter(player => player.id && !takenSlots.includes(player.id));
  return (
    <div className="max-w-md mx-auto px-4 py-12 page-enter">
      <div className="text-center mb-8"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-200 mx-auto mb-4 tracking-wider">{code}</div><p className="text-sm font-semibold text-indigo-600 mb-1">{gameName}</p><h1 className="text-xl font-bold text-slate-900">Choose Your Seat</h1><p className="text-sm text-slate-500 mt-1">The host has enabled player slots. Pick an available seat to enter your own scores.</p></div>
      <div className="card p-5 space-y-4">
        <div><label className="text-xs font-semibold text-slate-500 tracking-wider block mb-2">Display Name <span className="font-normal normal-case">(optional)</span></label><input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Keep the seat name" className="input-field" disabled={joining} /></div>
        {availableSeats.length ? <div className="grid gap-2">{availableSeats.map(seat => <button key={seat.id} type="button" onClick={() => claimSeat(seat)} disabled={joining} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"><span className="font-semibold text-slate-800">{seat.player_name}</span><span className="text-xs font-medium text-indigo-600">Choose</span></button>)}</div> : <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">No seats are available yet. Ask the host to add a player seat.</p>}
      </div>
    </div>
  );
}
