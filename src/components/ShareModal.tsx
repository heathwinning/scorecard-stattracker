"use client";

import { useState } from "react";
import { shareScorecard } from "@/lib/api-client";
import { guestUpdateScorecard } from "@/lib/guest-store";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";
import { HiOutlineLink, HiOutlineClipboardCopy } from "react-icons/hi";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface ShareModalProps {
  scorecardId: string;
  shareCode: string | null;
  isGuest?: boolean;
  onClose: () => void;
  onShared: (code: string) => void;
}

export default function ShareModal({ scorecardId, shareCode: existingCode, isGuest, onClose, onShared }: ShareModalProps) {
  const [code, setCode] = useState(existingCode || "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const joinUrl = code ? `${window.location.origin}/join/${code}` : "";

  const handleShare = async () => {
    if (code) return;
    setLoading(true);
    try {
      if (isGuest || scorecardId.startsWith("guest-")) {
        const newCode = generateCode();
        guestUpdateScorecard(scorecardId, { share_code: newCode } as any);
        setCode(newCode);
        onShared(newCode);
        toast.success("Share link created!");
      } else {
        const result = await shareScorecard(scorecardId);
        setCode(result.share_code);
        onShared(result.share_code);
        toast.success("Share link created!");
      }
    } catch { toast.error("Failed to create share link"); }
    finally { setLoading(false); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={true} onClose={onClose} title="Share Scorecard">
      {!code ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Generate a share link so friends can join and enter their scores.</p>
          <button onClick={handleShare} disabled={loading} className="btn-primary w-full">
            <HiOutlineLink className="w-4 h-4" />
            {loading ? "Creating..." : "Create Share Link"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold tracking-[0.3em] text-indigo-600 mb-2">{code}</div>
            <p className="text-xs text-slate-400">Share this code with friends</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={joinUrl} readOnly className="input-field text-sm font-mono flex-1"
              onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button onClick={copyLink} className={`btn-secondary text-sm shrink-0 ${copied ? "!bg-emerald-50 !text-emerald-700" : ""}`}>
              <HiOutlineClipboardCopy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">Players go to this link or enter the code at <strong>/join</strong></p>
        </div>
      )}
    </Modal>
  );
}
