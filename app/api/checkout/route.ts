import { NextResponse } from "next/server";
import { defineQuery } from "next-sanity";
import Stripe from "stripe";
import { PRICE_SET, PRICE_SINGLE, WORKS } from "~/app/(web)/wonders-of-reflection/works";
import { env } from "~/env";
import { sanityFetch } from "~/features/sanity/client";
import { printSkusConsumedBy } from "~/features/store/stock";

export const runtime = "nodejs";

/** Only id + qty are trusted from the client; prices are re-resolved server-side (see below). */
type IncomingItem = { id: string; qty: number; price?: number; title?: string };

type BookRows = Array<{
  bookId: string;
  title: string;
  variants: Array<{ key: string | null; name: string | null; price: number | null; stock: number | null }> | null;
}>;

type StockDoc = { items: Array<{ sku: string | null; stock: number | null }> | null } | null;

// Authoritative book data — never trust a price sent from the browser cart (localStorage).
const BookRowsQ = defineQuery(`*[_type == "book"]{ "bookId": _id, title, variants[]{ "key": _key, name, price, stock } }`);
const StockQ = defineQuery(`*[_id == "storeStock"][0]{ "items": items[]{ sku, stock } }`);

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

  let body: { items?: IncomingItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const [books, stockDoc] = await Promise.all([
    sanityFetch<BookRows>({ query: BookRowsQ, options: { next: { revalidate: 30 } } }),
    sanityFetch<StockDoc>({ query: StockQ, options: { next: { revalidate: 30 } } }),
  ]);

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

  for (const it of items) {
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));
    let unitEur: number | null = null;
    let label = (it.title || "Item").slice(0, 200);

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
    } else if (it.id.startsWith("service:") || it.id.startsWith("workshop:")) {
      // Hidden post-contact services; custom amounts are buyer-entered. Interim: use the sent price.
      const p = Number(it.price);
      if (Number.isFinite(p) && p > 0) {
        unitEur = Math.round(p);
      }
    }

    if (unitEur == null || unitEur <= 0) {
      return NextResponse.json({ error: "One of the items couldn't be priced. Please refresh and try again." }, { status: 400 });
    }

    for (const sku of printSkusConsumedBy(it.id)) {
      printNeed.set(sku, (printNeed.get(sku) ?? 0) + qty);
    }

    lineItems.push({
      quantity: qty,
      price_data: { currency: "eur", unit_amount: Math.round(unitEur * 100), product_data: { name: label } },
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
    metadata: { cart: cartMeta.join(";").slice(0, 500) },
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
