"use client";

import * as React from "react";
import { useCart } from "./cart-context";
import { serviceSlug, voucherId } from "./services";

export type VoucherOption = { label: string; price: number };

/** Short, consistent line that rides along to the cart + Stripe so the buyer always sees the terms. */
export const VOUCHER_TERMS = "Redeemable voucher · a gift or for yourself · valid any time";

/**
 * "Purchase as a voucher" control inside a workshop's book-or-enquire box: one dropdown of every
 * set-price option in that block, then add the chosen one to the cart as a gift voucher. The server
 * re-prices each line from the tier's own CMS price, so the amount can't be tampered. The copy makes
 * clear a voucher is redeemable forever (gift or self) and that dates/times are arranged afterwards.
 */
export function VoucherPicker({ options }: { options: VoucherOption[] }) {
  const { add } = useCart();
  const [selected, setSelected] = React.useState("");

  const chosen = options.find((option) => serviceSlug(option.label) === selected) ?? null;

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="voucher-picker">
      <div className="voucher-picker_head">
        <span className="voucher-picker_title">Buy a voucher</span>
        <p className="voucher-picker_terms">
          Redeemable any time — give it as a gift or keep it for yourself; it never expires. Dates and times are arranged with me
          by email after you book.
        </p>
      </div>

      <label className="voucher-picker_field">
        <span className="voucher-picker_label">Choose an option</span>
        <select className="voucher-picker_select" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Select an option…</option>
          {options.map((option) => (
            <option key={serviceSlug(option.label)} value={serviceSlug(option.label)}>
              {option.label} — €{option.price}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="voucher-picker_add"
        disabled={!chosen}
        onClick={() => {
          if (!chosen) {
            return;
          }
          add({
            id: voucherId(chosen.label),
            kind: "workshop",
            bookId: voucherId(chosen.label),
            slug: serviceSlug(chosen.label),
            title: `${chosen.label} — voucher`,
            variantName: VOUCHER_TERMS,
            price: chosen.price,
          });
          setSelected("");
        }}
      >
        {chosen ? `Add voucher — €${chosen.price}` : "Add voucher to cart"}
      </button>
    </div>
  );
}
