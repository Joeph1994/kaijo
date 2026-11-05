/**
 * Buyable workshops, services and gift vouchers share one id + price scheme across the storefront
 * (the workshop-page voucher buttons and the hidden /book picker) and the checkout. Ids are derived
 * from the item's own CMS label, so the browser and the server — which re-prices every service and
 * voucher line against Sanity — agree on the id without a second source of truth for prices.
 */

export const SERVICE_ID_PREFIX = "service:";
export const VOUCHER_ID_PREFIX = "voucher:";
/** A buyer-entered agreed amount: the full id is `service:custom:<amount>`. */
export const CUSTOM_SERVICE_ID = "service:custom";

/** Lowercase, hyphenated slug of a service/tier label — the stable part of its cart id. */
export function serviceSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Cart id for a set-price service (hidden /book items). */
export function serviceId(label: string): string {
  return `${SERVICE_ID_PREFIX}${serviceSlug(label)}`;
}

/** Cart id for a gift voucher sold from a workshop pricing tier. */
export function voucherId(label: string): string {
  return `${VOUCHER_ID_PREFIX}${serviceSlug(label)}`;
}

/** Parse a CMS display price like "€250" or "250" into a whole number of euros, or null if none. */
export function parseEuroPrice(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) {
    return null;
  }
  const amount = Number.parseInt(digits, 10);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
