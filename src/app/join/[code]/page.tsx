"use client";

export const runtime = 'edge';

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { joinScorecard, type ScorecardPlayer } from "@/lib/api-client";
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
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const init = async () => {
    if (authLoading) return;
    if (!user && !isGuest) { router.push(`/login?redirect=/join/${code}`); return; }
    if (!code) { setError("No code provided"); setLoading(false); return; }

    // Check guest store first
    const guestSc = guestFindByShareCode(code);
    if (guestSc) {
      setScorecardId(guestSc.id);
      setLoading(false);
      return;
    }

    try {
      // Just validate the code exists — don't join yet (wait for name)
      const result = await joinScorecard(code);
      setScorecardId(result.scorecard_id);
      // If they already have a slot, redirect directly
      if (result.player_slot_id) {
        setPlayerSlotId(result.player_slot_id);
        setPlayerName(result.player_name);
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired share code");
    }
    setLoading(false);
    };
    init();
  }, [user, isGuest, authLoading, code, router]);

  const handleJoin = useCallback(async () => {
    if (!scorecardId || !code) return;
    const name = customName.trim();
    if (!name) { toast.error("Enter your name"); return; }
    setJoining(true);
    try {
      if (isGuest || scorecardId.startsWith("guest-")) {
        // Create a player slot in guest store
        const { guestUpdateScorecard, guestGetScorecard } = await import("@/lib/guest-store");
        const sc = guestGetScorecard(scorecardId);
        if (sc) {
          const newSlotId = `slot-${crypto.randomUUID().slice(0, 8)}`;
          const updatedPlayers = [...(sc.players || []), {
            id: newSlotId,
            player_name: name,
            sort_order: sc.players?.length || 0,
          }];
          guestUpdateScorecard(scorecardId, { players: updatedPlayers } as any);
          setPlayerSlotId(newSlotId);
          setPlayerName(name);
        }
        toast.success("Joined!");
      } else {
        const result = await joinScorecard(code, name);
        setPlayerSlotId(result.player_slot_id);
        setPlayerName(result.player_name);
        toast.success("Joined!");
      }
    } catch { toast.error("Failed to join"); }
    finally { setJoining(false); }
  }, [scorecardId, code, customName, isGuest]);

  const handleGoToScorecard = () => {
    if (scorecardId) router.push(`/scores/${code}`);
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

  // Join — enter name
  return (
    <div className="max-w-md mx-auto px-4 py-12 page-enter">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-200 mx-auto mb-4 tracking-wider">
          {code}
        </div>
        <h1 className="text-xl font-bold text-slate-900">Join Game</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your name to start scoring</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
            placeholder="Enter your name"
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            autoFocus
            disabled={joining}
          />
        </div>
        <button
          onClick={handleJoin}
          disabled={joining || !customName.trim()}
          className="w-full py-3 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50"
        >
          {joining ? "Joining..." : "Join Game"}
        </button>
      </div>
    </div>
  );
}
