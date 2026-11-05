"use client";

import { useCart } from "./cart-context";
import { serviceSlug, voucherId } from "./services";

/**
 * "Buy as voucher" action on a workshop pricing tier: adds a gift voucher for that workshop/service
 * to the same cart (and checkout) as everything else. The server re-prices the line from the tier's
 * own CMS price, so the amount can't be tampered. Rendered only on tiers flagged "sell as voucher".
 */
export function VoucherPurchase({ label, price, note }: { label: string; price: number; note?: string | null }) {
  const { add } = useCart();

  return (
    <div className="tier-voucher">
      <button
        type="button"
        className="tier-voucher_button"
        onClick={() =>
          add({
            id: voucherId(label),
            kind: "workshop",
            bookId: voucherId(label),
            slug: serviceSlug(label),
            title: `${label} — gift voucher`,
            variantName: "Gift voucher · redeem any time",
            price,
          })
        }
      >
        <span className="tier-voucher_label">Buy as voucher</span>
        <span className="tier-voucher_price">€{price}</span>
      </button>
      {note && <span className="tier-voucher_note">{note}</span>}
    </div>
  );
}
