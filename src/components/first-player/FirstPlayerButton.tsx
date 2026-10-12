"use client";

import { HiOutlineUserGroup } from "react-icons/hi";
import { useFirstPlayer } from "./FirstPlayerProvider";

export default function FirstPlayerButton() {
  const { openPicker } = useFirstPlayer();

  return (
    <button
      type="button"
      onClick={openPicker}
      aria-label="Choose first player"
      className="fixed bottom-4 left-4 z-[60] inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-300/50 transition hover:bg-indigo-700 active:scale-95"
    >
      <HiOutlineUserGroup className="h-5 w-5" />
      <span className="hidden sm:inline">First player</span>
    </button>
  );
}
