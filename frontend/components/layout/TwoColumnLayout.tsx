import { ReactNode } from "react";

interface TwoColumnLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

/**
 * Desktop two-column layout: content left (flex-1), ad sidebar right (300px, sticky).
 * Sidebar is hidden below lg breakpoint — mobile/tablet see single-column content only.
 */
export function TwoColumnLayout({ children, sidebar }: TwoColumnLayoutProps) {
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex gap-8 items-start">
        {/* Primary content */}
        <div className="min-w-0 flex-1">{children}</div>

        {/* Ad sidebar — desktop only */}
        {sidebar && (
          <aside
            className="hidden lg:block w-[300px] flex-shrink-0 sticky top-[72px] self-start"
            aria-label="Advertisements"
          >
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
