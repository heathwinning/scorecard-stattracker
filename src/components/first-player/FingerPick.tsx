"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRandomIndex } from "@/lib/first-player/modes";

interface FingerTouch {
  id: number;
  x: number;
  y: number;
  color: string;
}

const FINGER_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

export default function FingerPick({ autoStartSeconds }: { autoStartSeconds: number }) {
  const [touches, setTouches] = useState<FingerTouch[]>([]);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const touchesRef = useRef(touches);
  const activePointersRef = useRef(new Set<number>());
  touchesRef.current = touches;

  const isPicked = winnerId !== null;
  const touchKey = touches.map((touch) => touch.id).join(",");

  const pickWinner = useCallback(() => {
    const current = touchesRef.current;
    if (current.length < 2) return;
    setWinnerId(current[pickRandomIndex(current.length)].id);
  }, []);

  useEffect(() => {
    if (isPicked || autoStartSeconds <= 0 || touchesRef.current.length < 2) return;
    const timer = setTimeout(pickWinner, autoStartSeconds * 1000);
    return () => clearTimeout(timer);
  }, [touchKey, isPicked, autoStartSeconds, pickWinner]);

  const getPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.add(event.pointerId);
    if (isPicked) return;
    const { pointerId } = event;
    const { x, y } = getPosition(event);
    setTouches((previous) => {
      if (previous.some((touch) => touch.id === pointerId)) return previous;
      return [
        ...previous,
        { id: pointerId, x, y, color: FINGER_COLORS[previous.length % FINGER_COLORS.length] },
      ];
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPicked) return;
    const { pointerId } = event;
    const { x, y } = getPosition(event);
    setTouches((previous) => previous.map((touch) => (touch.id === pointerId ? { ...touch, x, y } : touch)));
  };

  const handlePointerRelease = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (isPicked) return;
    const { pointerId } = event;
    setTouches((previous) => previous.filter((touch) => touch.id !== pointerId));
  };

  const resetPick = () => {
    setTouches(touchesRef.current.filter((touch) => activePointersRef.current.has(touch.id)));
    setWinnerId(null);
  };

  const touchCount = touches.length;
  const hint = isPicked
    ? "First player chosen"
    : touchCount === 0
      ? "Everyone place a finger on the screen"
      : touchCount === 1
        ? "Waiting for more fingers"
        : autoStartSeconds > 0
          ? "Keep still, picking soon"
          : "Ready when everyone is in";

  return (
    <div
      className="relative flex-1 touch-none select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
    >
      {touches.map((touch) => {
        const isWinner = touch.id === winnerId;
        const size = isWinner ? 160 : 96;
        return (
          <div
            key={touch.id}
            className={`pointer-events-none absolute flex items-center justify-center rounded-full text-lg font-extrabold text-white transition-all duration-300 ${isWinner ? "animate-pulse" : ""}`}
            style={{
              left: touch.x,
              top: touch.y,
              width: size,
              height: size,
              transform: "translate(-50%, -50%)",
              backgroundColor: touch.color,
              opacity: isPicked && !isWinner ? 0.15 : 0.9,
              boxShadow: isWinner ? `0 0 0 14px ${touch.color}55` : undefined,
            }}
          >
            {isWinner ? "First!" : null}
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-x-0 top-1/3 px-6 text-center text-lg font-semibold text-slate-300">
        {hint}
      </div>

      <div className="absolute inset-x-0 bottom-8 flex justify-center" onPointerDown={(event) => event.stopPropagation()}>
        {isPicked ? (
          <button type="button" onClick={resetPick} className="rounded-full bg-indigo-500 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-indigo-400">
            Pick again
          </button>
        ) : autoStartSeconds === 0 && touchCount >= 2 ? (
          <button type="button" onClick={pickWinner} className="rounded-full bg-amber-400 px-8 py-3 text-base font-semibold text-slate-900 shadow-lg hover:bg-amber-300">
            Pick first player
          </button>
        ) : null}
      </div>
    </div>
  );
}
