import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  gradient?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  gradient = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between mb-6", className)}>
      <div>
        <h2
          className={cn(
            "text-2xl sm:text-3xl font-bold",
            gradient
              ? "bg-gradient-brand bg-clip-text text-transparent"
              : "text-text-primary"
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}
