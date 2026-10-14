"use client";

import React, { useState, useRef } from "react";

import { formatCount } from "@/lib/utils";

// ── CSS keyframes (injected once per page) ────────────────────────────────────

export const FLOAT_KEYFRAMES = `
@keyframes fm-float-up {
  0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  60%  { opacity: 0.85; }
  100% { opacity: 0; transform: translateY(-52px) scale(0.7) rotate(-8deg); }
}
@keyframes fm-ripple {
  0%   { opacity: 0.5; transform: scale(0.4); }
  100% { opacity: 0;   transform: scale(2.4); }
}
@keyframes fm-heart-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.82); }
  65%  { transform: scale(1.28); }
  100% { transform: scale(1); }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function getOrCreateVoterKey(): string {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem("fanmeter_voter_key");
  if (!k) {
    k = "fmk_" + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem("fanmeter_voter_key", k);
  }
  return k;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FloatItem { id: number; x: number; y: number }

// ── HeartIcon ─────────────────────────────────────────────────────────────────

export function HeartIcon({
  filled,
  className,
  style,
}: {
  filled:     boolean;
  className?: string;
  style?:     React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      )}
    </svg>
  );
}

// ── FloatingHeart ─────────────────────────────────────────────────────────────

export function FloatingHeart({
  x,
  y,
  onDone,
}: {
  x:      number;
  y:      number;
  onDone: () => void;
}) {
  return (
    <div
      onAnimationEnd={onDone}
      style={{
        position:      "fixed",
        left:          x - 18,
        top:           y - 10,
        pointerEvents: "none",
        zIndex:        9999,
        animation:     "fm-float-up 800ms ease-out forwards",
        display:       "flex",
        alignItems:    "center",
        gap:           2,
        userSelect:    "none",
      }}
    >
      <svg viewBox="0 0 24 24" width={14} height={14} style={{ color: "#f43f5e" }}>
        <path
          fill="currentColor"
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
             2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
             C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
             c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        />
      </svg>
      <span
        style={{
          fontSize:   11,
          fontWeight: 700,
          color:      "#f43f5e",
          textShadow: "0 1px 3px rgba(244,63,94,0.25)",
          lineHeight: 1,
        }}
      >
        +1
      </span>
    </div>
  );
}

// ── HeartButton ───────────────────────────────────────────────────────────────

export function HeartButton({
  pending,
  count,
  onClick,
  contestantName,
}: {
  pending:        boolean;
  count:          number;
  onClick:        (rect: DOMRect) => void;
  contestantName: string;
}) {
  const [popping,  setPopping]  = useState(false);
  const [rippling, setRippling] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (pending) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPopping(true);
    setRippling(true);
    setTimeout(() => setPopping(false),  350);
    setTimeout(() => setRippling(false), 500);

    onClick(rect);
  }

  const countLabel = formatCount(count);

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={pending}
      aria-label={`Support ${contestantName}`}
      className="flex flex-col items-center gap-0.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
      style={{ opacity: pending ? 0.45 : 1, cursor: pending ? "wait" : "pointer" }}
    >
      <div
        className="relative flex items-center justify-center w-9 h-9 rounded-full border border-rose-200 bg-white shadow-sm transition-colors duration-150 hover:bg-rose-50 hover:border-rose-300"
        style={{ overflow: "visible" }}
      >
        {rippling && (
          <span
            className="absolute inset-0 rounded-full border-2 border-rose-400"
            style={{ animation: "fm-ripple 500ms ease-out forwards" }}
          />
        )}
        <HeartIcon
          filled={popping}
          className="w-[18px] h-[18px] text-rose-500 transition-colors duration-150"
          style={{
            animation: popping ? "fm-heart-pop 350ms ease-out forwards" : "none",
          }}
        />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 tabular-nums leading-none min-w-[28px] text-center">
        {countLabel}
      </span>
    </button>
  );
}
