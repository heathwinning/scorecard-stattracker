"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { joinScorecard, assignSlot, getScorecard, type ScorecardPlayer } from "@/lib/api-client";
import { guestFindByShareCode } from "@/lib/guest-store";
import Link from "next/link";
import toast from "react-hot-toast";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const code = (params.code as string)?.toUpperCase() || "";

  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [playerSlotId, setPlayerSlotId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const init = async () => {
    if (authLoading) return;
    if (!user && !isGuest) { router.push(`/login?redirect=/join/${code}`); return; }
    if (!code) { setError("No code provided"); setLoading(false); return; }

    // Check guest store first
    const guestSc = guestFindByShareCode(code);
    if (guestSc) {
      setScorecardId(guestSc.id);
      const { guestGetScorecard } = await import("@/lib/guest-store");
      const data = guestGetScorecard(guestSc.id);
      if (data) { setPlayers(data.players || []); }
      setLoading(false);
      return;
    }

    try {
      const result = await joinScorecard(code);
      setScorecardId(result.scorecard_id);
      setPlayerSlotId(result.player_slot_id);
      setPlayerName(result.player_name);
      const sc = await getScorecard(result.scorecard_id);
      setPlayers(sc.players || []);
    } catch (err: any) {
      setError(err.message || "Invalid or expired share code");
    }
    setLoading(false);
    };
    init();
  }, [user, isGuest, authLoading, code, router]);

  const handleClaimSlot = useCallback(async (slotId: string) => {
    if (!scorecardId) return;
    setAssigning(true);
    try {
      if (isGuest || scorecardId.startsWith("guest-")) {
        setPlayerSlotId(slotId);
        const slot = players.find(p => p.id === slotId);
        if (slot) setPlayerName(slot.player_name);
        toast.success("Slot claimed!");
      } else {
        await assignSlot(scorecardId, slotId);
        setPlayerSlotId(slotId);
        const slot = players.find(p => p.id === slotId);
        if (slot) setPlayerName(slot.player_name);
        toast.success("Slot claimed!");
      }
    } catch { toast.error("Failed to claim slot"); }
    finally { setAssigning(false); }
  }, [scorecardId, players, isGuest]);

  const handleGoToScorecard = () => {
    if (scorecardId) router.push(`/scorecards/${scorecardId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 animate-pulse">
        <div className="h-8 w-32 bg-slate-200 rounded mb-4" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="empty-state-icon mx-auto mb-4">🔗</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <Link href="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
      </div>
    );
  }

  // Already has a slot assigned
  if (playerSlotId && playerName) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center page-enter">
        <div className="empty-state-icon mx-auto mb-4">✅</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">You're in!</h1>
        <p className="text-sm text-slate-500 mb-2">
          Playing as <strong>{playerName}</strong>
        </p>
        <p className="text-xs text-slate-400 mb-6">
          You can now enter scores for your player slot. Other players' scores are hidden until they reveal them.
        </p>
        <button onClick={handleGoToScorecard} className="btn-primary">
          Open Scorecard
        </button>
      </div>
    );
  }

  // Joined but needs to pick a slot
  return (
    <div className="max-w-md mx-auto px-4 py-12 page-enter">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 mx-auto mb-4">
          {code.slice(0, 2)}
        </div>
        <h1 className="text-xl font-bold text-slate-900">Join Game</h1>
        <p className="text-sm text-slate-500 mt-1">Pick your player slot to start scoring</p>
      </div>

      <div className="card p-5 space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Available Players
        </h3>
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => handleClaimSlot(player.id!)}
            disabled={assigning}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left"
          >
            <span className="font-medium text-slate-900">{player.player_name}</span>
            <span className="text-xs text-indigo-500 font-medium">Claim →</span>
          </button>
        ))}
        {players.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            No player slots available. Ask the game creator to add players first.
          </p>
        )}
      </div>
    </div>
  );
}
