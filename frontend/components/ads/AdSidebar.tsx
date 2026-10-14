import { AdSlot } from "./AdSlot";

const SIDEBAR_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR;

/**
 * Right-column ad sidebar. Renders one 300×250 unit.
 * Invisible on mobile (controlled by parent TwoColumnLayout's hidden lg:block).
 */
export function AdSidebar() {
  return (
    <div className="space-y-4" data-testid="ad-sidebar">
      <AdSlot slotId={SIDEBAR_SLOT} format="rectangle" reservedHeight={250} />
    </div>
  );
}
