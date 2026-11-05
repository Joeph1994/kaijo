/**
 * Discount codes for the shop. Validated server-side in /api/checkout (the cart only previews the
 * effect). A voucher either takes a euro amount off each individual exhibition print
 * (`singlePrintDiscount`, WOFVIP-style) or a percentage off every item's price (`percentOff`, a
 * site-wide sale). Shipping is never discounted.
 */
export type Voucher = { code: string; singlePrintDiscount?: number; percentOff?: number };

const VOUCHERS: Record<string, Voucher> = {
  WOFVIP: { code: "WOFVIP", singlePrintDiscount: 30 },
  // Launch celebration — 25% off every item (books, prints, workshops & vouchers); shipping untouched.
  LAUNCH25: { code: "LAUNCH25", percentOff: 25 },
};

export function normalizeVoucher(input: string | null | undefined): string {
  return (input ?? "").trim().toUpperCase();
}

export function voucherFor(input: string | null | undefined): Voucher | undefined {
  const code = normalizeVoucher(input);
  return code ? VOUCHERS[code] : undefined;
}

/** A single exhibition print (not the set) — the only thing the euro-off voucher discounts. */
export function isDiscountablePrint(id: string): boolean {
  return id.startsWith("print:wor:") && id !== "print:wor:set";
}

/** The discounted unit price (euros) for one line given the applied voucher; shipping is untouched. */
export function discountedUnit(voucher: Voucher | undefined, id: string, unitEur: number): number {
  if (!voucher) {
    return unitEur;
  }
  if (voucher.percentOff) {
    return Math.max(0, unitEur * (1 - voucher.percentOff / 100));
  }
  if (voucher.singlePrintDiscount && isDiscountablePrint(id)) {
    return Math.max(1, unitEur - voucher.singlePrintDiscount);
  }
  return unitEur;
}

/** Total discount (euros) a voucher gives a cart — used for the cart preview. */
export function previewDiscount(voucher: Voucher | undefined, items: Array<{ id: string; price: number; qty: number }>): number {
  if (!voucher) {
    return 0;
  }
  const raw = items.reduce((sum, item) => sum + (item.price - discountedUnit(voucher, item.id, item.price)) * item.qty, 0);
  return Math.round(raw * 100) / 100;
}
