"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdSlotProps {
  slotId: string | undefined;
  format?: "auto" | "rectangle";
  className?: string;
  /** Stable height in px to reserve — prevents layout shift */
  reservedHeight?: number;
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const IS_DEV  = process.env.NODE_ENV === "development";

export function AdSlot({ slotId, format = "auto", className, reservedHeight = 250 }: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slotId) return;
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad push failures must never break the page
    }
  }, [slotId]);

  // Production with no client ID → render nothing at all
  if (!CLIENT && !IS_DEV) return null;

  // Dev placeholder when AdSense is not configured
  if (!CLIENT || !slotId) {
    if (!IS_DEV) return null;
    return (
      <div
        className={`flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 text-xs font-medium select-none ${className ?? ""}`}
        style={{ minHeight: reservedHeight }}
        aria-hidden="true"
        data-testid="ad-placeholder"
      >
        Ad Placeholder · 300×{reservedHeight}
      </div>
    );
  }

  // Real AdSense unit
  return (
    <ins
      className={`adsbygoogle ${className ?? ""}`}
      style={{ display: "block", minHeight: reservedHeight }}
      data-ad-client={CLIENT}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="false"
      data-testid="ad-slot"
    />
  );
}
