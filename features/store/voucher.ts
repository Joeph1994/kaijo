/**
 * Discount codes for the shop. Validated server-side in /api/checkout (the cart only previews the
 * effect). `singlePrintDiscount` is subtracted, in euro, from each individual exhibition print
 * (`print:wor:01`…`08`) — not the set, books or services.
 */
export type Voucher = { code: string; singlePrintDiscount: number };

const VOUCHERS: Record<string, Voucher> = {
  WOFVIP: { code: "WOFVIP", singlePrintDiscount: 30 },
};

export function normalizeVoucher(input: string | null | undefined): string {
  return (input ?? "").trim().toUpperCase();
}

export function voucherFor(input: string | null | undefined): Voucher | undefined {
  const code = normalizeVoucher(input);
  return code ? VOUCHERS[code] : undefined;
}

/** A single exhibition print (not the set) — the only thing the current voucher discounts. */
export function isDiscountablePrint(id: string): boolean {
  return id.startsWith("print:wor:") && id !== "print:wor:set";
}
