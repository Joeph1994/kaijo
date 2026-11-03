import { WORKS } from "~/app/(web)/wonders-of-reflection/works";

/** SKU of the complete-set print product. */
export const PRINT_SET_SKU = "print:wor:set";

/** SKUs of the eight individual exhibition prints. */
export const PRINT_SINGLE_SKUS = WORKS.map((w) => `print:wor:${w.id}`);

/** Every exhibition-print SKU tracked in the `storeStock` singleton. */
export const ALL_PRINT_SKUS = [...PRINT_SINGLE_SKUS, PRINT_SET_SKU];

/**
 * The print-stock SKUs that one unit of `sku` consumes. A single consumes itself; the set consumes
 * itself **and** one of every single (a set is one of each). Non-print SKUs (books, services) return
 * an empty list — their stock is tracked elsewhere (book editions) or not at all (services).
 */
export function printSkusConsumedBy(sku: string): string[] {
  if (sku === PRINT_SET_SKU) {
    return [PRINT_SET_SKU, ...PRINT_SINGLE_SKUS];
  }
  if (PRINT_SINGLE_SKUS.includes(sku)) {
    return [sku];
  }
  return [];
}
