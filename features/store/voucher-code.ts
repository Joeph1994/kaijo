import { VOUCHER_ID_PREFIX } from "./services";

/**
 * Unique, readable gift-voucher codes. A code is built from the voucher type, the date and time of
 * purchase (Europe/Amsterdam), and a short uniquifier from the Stripe session, so two same-minute
 * purchases of the same type never collide. Format: `JH-<TYPE>-<YYMMDD>-<HHMM>-<SUFFIX>`.
 */

/** Short, legible type segment per voucher sku; unknown skus fall back to initials of the slug. */
const TYPE_CODES: Record<string, string> = {
  "2-hour-workshop": "WS2",
  "4-hour-workshop": "WS4",
  "4-hour-workshop-2-hour-masterclass-portfolio-review": "DAY",
  "1-hour-portfolio-review": "POR",
  "2-hour-editing-colour-grading-workshop": "EDIT",
};

export function isVoucherSku(id: string): boolean {
  return id.startsWith(VOUCHER_ID_PREFIX);
}

export function voucherTypeCode(voucherSku: string): string {
  const slug = voucherSku.startsWith(VOUCHER_ID_PREFIX) ? voucherSku.slice(VOUCHER_ID_PREFIX.length) : voucherSku;
  const known = TYPE_CODES[slug];
  if (known) {
    return known;
  }
  const compact = slug.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compact.slice(0, 5) || "VCH";
}

/** Date (YYMMDD) and time (HHMM) of purchase in Amsterdam local time. */
function amsterdamStamp(when: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(when);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}${get("month")}${get("day")}`, time: `${get("hour")}${get("minute")}` };
}

/** Deterministic 4-char base36 suffix (uppercase) from a seed — the per-purchase uniquifier. */
function shortHash(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase().slice(-4).padStart(4, "0");
}

export function generateVoucherCode({
  voucherSku,
  purchasedAt,
  uniqueSeed,
}: {
  voucherSku: string;
  purchasedAt: Date;
  uniqueSeed: string;
}): string {
  const { date, time } = amsterdamStamp(purchasedAt);
  return `JH-${voucherTypeCode(voucherSku)}-${date}-${time}-${shortHash(uniqueSeed)}`;
}

/** The thing the voucher is for, cleaned of the "— voucher" / "— gift voucher" suffix for display. */
export function voucherSubject(label: string): string {
  return label.replace(/\s*[—-]\s*(gift\s+)?voucher\s*$/i, "").trim() || "Workshop voucher";
}
