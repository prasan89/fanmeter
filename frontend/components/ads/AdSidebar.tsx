import { AdSlot } from "./AdSlot";

const SIDEBAR_SLOT      = process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR;
const SIDEBAR_TALL_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_TALL;

/**
 * Right-column ad sidebar. Renders a 300×250 rectangle and a 300×600 half-page unit.
 * Visibility on mobile is controlled by the parent TwoColumnLayout (hidden lg:block).
 */
export function AdSidebar() {
  return (
    <div className="space-y-4" data-testid="ad-sidebar">
      <AdSlot slotId={SIDEBAR_SLOT}      format="rectangle" reservedHeight={250} />
      <AdSlot slotId={SIDEBAR_TALL_SLOT} format="rectangle" reservedHeight={600} />
    </div>
  );
}
