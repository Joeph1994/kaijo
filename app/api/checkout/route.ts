import { NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import Stripe from "stripe";
import { PRICE_SET, PRICE_SINGLE, WORKS } from "~/app/(web)/wonders-of-reflection/works";
import { env } from "~/env";
import { sanityFetch } from "~/features/sanity/client";
import {
  CUSTOM_SERVICE_ID,
  parseEuroPrice,
  SERVICE_ID_PREFIX,
  serviceId,
  VOUCHER_ID_PREFIX,
  voucherId,
} from "~/features/store/services";
import { printSkusConsumedBy } from "~/features/store/stock";
import { isDiscountablePrint, voucherFor } from "~/features/store/voucher";

export const runtime = "nodejs";

/** Only id + qty are trusted from the client; prices are re-resolved server-side (see below). */
type IncomingItem = { id: string; qty: number; price?: number; title?: string };

type BookRows = Array<{
  bookId: string;
  title: string;
  variants: Array<{ key: string | null; name: string | null; price: number | null; stock: number | null }> | null;
}>;

type StockDoc = { items: Array<{ sku: string | null; stock: number | null }> | null } | null;

// Authoritative prices for buyable workshops/services + vouchers, gathered from every page so the
// server never trusts the amount sent from the browser cart. Returns per-page arrays we flatten.
type ServicePriceRows = Array<{
  services: Array<{ name: string | null; price: number | null }> | null;
  vouchers: Array<{ title: string | null; price: string | null }> | null;
} | null>;

// Authoritative book data — never trust a price sent from the browser cart (localStorage).
const BookRowsQ = defineQuery(`*[_type == "book"]{ "bookId": _id, title, variants[]{ "key": _key, name, price, stock } }`);
const StockQ = defineQuery(`*[_id == "storeStock"][0]{ "items": items[]{ sku, stock } }`);
const ServicePricesQ = defineQuery(`*[_type == "page"]{
  "services": pageBuilder.sectionsArray[_type == "serviceShopSectionField"].sectionContent.items[]{ name, price },
  "vouchers": pageBuilder.sectionsArray[_type == "workshopPricingSectionField"].sectionContent.tiers[sellAsVoucher == true]{ title, price },
}`);

/**
 * Flat shipping rates shown at checkout (in cents). The buyer picks the one for their region.
 */
const SHIPPING_OPTIONS: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
  { shipping_rate_data: { type: "fixed_amount", display_name: "Netherlands", fixed_amount: { amount: 495, currency: "eur" } } },
  { shipping_rate_data: { type: "fixed_amount", display_name: "Europe", fixed_amount: { amount: 995, currency: "eur" } } },
  {
    shipping_rate_data: { type: "fixed_amount", display_name: "Rest of world", fixed_amount: { amount: 1995, currency: "eur" } },
  },
];

const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "NL",
  "BE",
  "DE",
  "FR",
  "GB",
  "IE",
  "ES",
  "IT",
  "AT",
  "DK",
  "SE",
  "FI",
  "PT",
  "LU",
  "PL",
  "CZ",
  "GR",
  "HU",
  "RO",
  "SK",
  "SI",
  "HR",
  "BG",
  "EE",
  "LV",
  "LT",
  "CY",
  "MT",
  "NO",
  "CH",
  "IS",
  "US",
  "CA",
  "AU",
  "NZ",
  "JP",
  "SG",
  "AE",
];

const outOfStock = () =>
  NextResponse.json(
    { error: "Sorry — one of your items just sold out or doesn't have enough left. Please adjust your cart." },
    { status: 409 }
  );

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout isn't set up yet. Please email me@joephijwegen.com to order." }, { status: 503 });
  }

  let body: { items?: IncomingItem[]; promoCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  // Validated here (never trusted from the client); applies to single prints only.
  const voucher = voucherFor(body.promoCode);

  const [books, stockDoc, servicePriceRows] = await Promise.all([
    sanityFetch<BookRows>({ query: BookRowsQ, options: { next: { revalidate: 30 } } }),
    sanityFetch<StockDoc>({ query: StockQ, options: { next: { revalidate: 30 } } }),
    sanityFetch<ServicePriceRows>({ query: ServicePricesQ, options: { next: { revalidate: 30 } } }),
  ]);

  // Authoritative service/voucher prices keyed by their cart id (same id scheme as the storefront).
  const servicePrice = new Map<string, number>();
  const voucherPrice = new Map<string, number>();
  for (const page of servicePriceRows ?? []) {
    for (const svc of page?.services ?? []) {
      if (svc?.name && typeof svc.price === "number" && svc.price > 0) {
        servicePrice.set(serviceId(svc.name), Math.round(svc.price));
      }
    }
    for (const vch of page?.vouchers ?? []) {
      const price = parseEuroPrice(vch?.price);
      if (vch?.title && price != null) {
        voucherPrice.set(voucherId(vch.title), price);
      }
    }
  }

  const bookPrice = new Map<string, number>();
  const bookLabel = new Map<string, string>();
  const bookStock = new Map<string, number | null>();
  for (const b of books ?? []) {
    for (const v of b.variants ?? []) {
      if (v?.key && typeof v.price === "number") {
        const sku = `${b.bookId}:${v.key}`;
        bookPrice.set(sku, v.price);
        bookLabel.set(sku, `${b.title} — ${v.name}`);
        bookStock.set(sku, typeof v.stock === "number" ? v.stock : null);
      }
    }
  }

  const printStock = new Map<string, number | null>();
  for (const s of stockDoc?.items ?? []) {
    if (s?.sku) {
      printStock.set(s.sku, typeof s.stock === "number" ? s.stock : null);
    }
  }

  let hasPhysical = false;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const cartMeta: string[] = [];
  // Total units required per tracked SKU across the whole cart (a set consumes every single too).
  const printNeed = new Map<string, number>();
  const bookNeed = new Map<string, number>();

  // Shown on the Stripe line so a voucher buyer sees exactly what a voucher is before paying.
  const VOUCHER_DESCRIPTION =
    "Redeemable voucher — a gift or for yourself, valid any time, never expires. Dates and times are arranged with Joep by email after purchase.";

  for (const it of items) {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    let unitEur: number | null = null;
    let label = (it.title || "Item").slice(0, 200);
    let description: string | null = null;

    if (it.id === "print:wor:set") {
      unitEur = PRICE_SET;
      label = "Wonders of Reflection — complete set of 8 prints";
      hasPhysical = true;
    } else if (it.id.startsWith("print:wor:")) {
      const work = WORKS.find((w) => w.id === it.id.slice("print:wor:".length));
      unitEur = PRICE_SINGLE;
      label = work ? `Wonders of Reflection — ${work.cocktail} (print)` : "Wonders of Reflection print";
      hasPhysical = true;
    } else if (bookPrice.has(it.id)) {
      unitEur = bookPrice.get(it.id) ?? null;
      label = bookLabel.get(it.id) ?? label;
      hasPhysical = true;
      bookNeed.set(it.id, (bookNeed.get(it.id) ?? 0) + qty);
    } else if (it.id.startsWith(VOUCHER_ID_PREFIX)) {
      // Workshop/coaching gift vouchers — strictly priced from the CMS tier, never the client; an
      // unknown voucher falls through to the "couldn't be priced" guard below.
      unitEur = voucherPrice.get(it.id) ?? null;
      label = (it.title || "Workshop voucher").slice(0, 200);
      description = VOUCHER_DESCRIPTION;
    } else if (it.id === CUSTOM_SERVICE_ID || it.id.startsWith(`${CUSTOM_SERVICE_ID}:`)) {
      // Buyer-entered agreed amount, encoded in the id (service:custom:<amount>).
      const p = Number.parseInt(it.id.split(":")[2] ?? "", 10);
      if (Number.isFinite(p) && p > 0) {
        unitEur = p;
      }
    } else if (it.id.startsWith(SERVICE_ID_PREFIX)) {
      // Hidden post-enquiry services — priced from the CMS item (falls back to the sent price only
      // for a legacy id no longer in the CMS, so an old cart still checks out).
      const p = Number(it.price);
      unitEur = servicePrice.get(it.id) ?? (Number.isFinite(p) && p > 0 ? Math.round(p) : null);
    } else if (it.id.startsWith("workshop:")) {
      // Bookable-workshop action (WorkshopPurchase) — sent price (set per page in the CMS).
      const p = Number(it.price);
      if (Number.isFinite(p) && p > 0) {
        unitEur = Math.round(p);
      }
    }

    if (voucher && unitEur != null && isDiscountablePrint(it.id)) {
      unitEur = Math.max(1, unitEur - voucher.singlePrintDiscount);
    }

    if (unitEur == null || unitEur <= 0) {
      return NextResponse.json({ error: "One of the items couldn't be priced. Please refresh and try again." }, { status: 400 });
    }

    for (const sku of printSkusConsumedBy(it.id)) {
      printNeed.set(sku, (printNeed.get(sku) ?? 0) + qty);
    }

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "eur",
        unit_amount: Math.round(unitEur * 100),
        product_data: { name: label, ...(description ? { description } : {}) },
      },
    });
    cartMeta.push(`${it.id}|${qty}`);
  }

  // Block the checkout if any tracked item hasn't enough stock (untracked = null = unlimited).
  for (const [sku, need] of printNeed) {
    const avail = printStock.get(sku);
    if (typeof avail === "number" && need > avail) {
      return outOfStock();
    }
  }
  for (const [sku, need] of bookNeed) {
    const avail = bookStock.get(sku);
    if (typeof avail === "number" && need > avail) {
      return outOfStock();
    }
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const base = env.NEXT_PUBLIC_URL;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    success_url: `${base}/checkout/success`,
    cancel_url: `${base}/store`,
    billing_address_collection: "auto",
    allow_promotion_codes: false,
    // The webhook reads this to record the order and decrement stock (Stripe caps a value at 500 chars).
    metadata: { cart: cartMeta.join(";").slice(0, 500), ...(voucher ? { voucher: voucher.code } : {}) },
  };

  if (hasPhysical) {
    params.shipping_address_collection = { allowed_countries: SHIPPING_COUNTRIES };
    params.shipping_options = SHIPPING_OPTIONS;
  }

  try {
    const session = await stripe.checkout.sessions.create(params);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session failed:", error);
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again, or email me@joephijwegen.com." },
      { status: 500 }
    );
  }
}
