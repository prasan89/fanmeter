import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "live" | "upcoming" | "completed" | "active" | "eliminated" | "trending" | "new";
}

const variantStyles = {
  live: "bg-red-50 text-red-600 border border-red-200",
  upcoming: "bg-orange-50 text-orange-600 border border-orange-200",
  completed: "bg-gray-100 text-gray-600 border border-gray-200",
  active: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  eliminated: "bg-gray-100 text-gray-500 border border-gray-200",
  trending: "bg-brand-purple/10 text-brand-purple border border-brand-purple/20",
  new: "bg-gradient-brand text-white border-0",
};

const dotStyles = {
  live: "bg-red-500 animate-pulse-live",
  upcoming: "bg-orange-500",
  completed: "bg-gray-400",
  active: "bg-emerald-500",
  eliminated: "bg-gray-400",
  trending: "bg-brand-purple",
  new: "bg-white",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "active", children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {(variant === "live" || variant === "upcoming" || variant === "active") && (
          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotStyles[variant])} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
