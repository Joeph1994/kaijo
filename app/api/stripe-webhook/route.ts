import { NextResponse } from "next/server";
import { Resend } from "resend";
import Stripe from "stripe";
import { env } from "~/env";
import { sanityEditClient } from "~/features/sanity/client";
import { printSkusConsumedBy } from "~/features/store/stock";
import { voucherFor } from "~/features/store/voucher";
import { generateVoucherCode, isVoucherSku, voucherSubject } from "~/features/store/voucher-code";
import { renderVoucherPdf, voucherPdfAssets } from "~/features/store/voucher-pdf";

export const runtime = "nodejs";

const NOTIFY_TO = "me@joephijwegen.com";

/** Parse the compact `id|qty;id|qty` cart written by /api/checkout into the session metadata. */
function parseCart(meta: string | null | undefined): Array<{ id: string; qty: number }> {
  if (!meta) {
    return [];
  }
  return meta
    .split(";")
    .map((pair) => {
      const sep = pair.lastIndexOf("|");
      if (sep < 0) {
        return null;
      }
      const id = pair.slice(0, sep);
      const qty = Math.max(1, Math.floor(Number(pair.slice(sep + 1)) || 1));
      return id ? { id, qty } : null;
    })
    .filter((x): x is { id: string; qty: number } => x !== null);
}

async function decrementStock(cart: Array<{ id: string; qty: number }>) {
  // Exhibition prints (storeStock singleton) — a set also consumes one of every single.
  const printNeed = new Map<string, number>();
  // Book editions — decrement the variant's stock on its book doc.
  const bookNeed = new Map<string, { bookId: string; key: string; qty: number }>();

  for (const { id, qty } of cart) {
    for (const sku of printSkusConsumedBy(id)) {
      printNeed.set(sku, (printNeed.get(sku) ?? 0) + qty);
    }
    if (id.startsWith("book-") && id.includes(":")) {
      const sep = id.indexOf(":");
      const bookId = id.slice(0, sep);
      const key = id.slice(sep + 1);
      const prev = bookNeed.get(id);
      bookNeed.set(id, { bookId, key, qty: (prev?.qty ?? 0) + qty });
    }
  }

  if (printNeed.size > 0) {
    const dec: Record<string, number> = {};
    for (const [sku, n] of printNeed) {
      dec[`items[sku=="${sku}"].stock`] = n;
    }
    await sanityEditClient.patch("storeStock").dec(dec).commit();
  }

  for (const { bookId, key, qty } of bookNeed.values()) {
    await sanityEditClient
      .patch(bookId)
      .dec({ [`variants[_key=="${key}"].stock`]: qty })
      .commit();
  }

  // Flip any book edition that hit 0 to "sold out" (the storefront reads availability).
  const bookIds = [...new Set([...bookNeed.values()].map((b) => b.bookId))];
  if (bookIds.length > 0) {
    const rows = await sanityEditClient.fetch<
      Array<{ _id: string; variants: Array<{ _key: string; stock: number | null; availability: string | null }> | null }>
    >(`*[_id in $ids]{ _id, variants[]{ _key, stock, availability } }`, { ids: bookIds });
    for (const b of rows) {
      for (const v of b.variants ?? []) {
        if (typeof v.stock === "number" && v.stock <= 0 && v.availability !== "soldOut") {
          await sanityEditClient
            .patch(b._id)
            .set({ [`variants[_key=="${v._key}"].availability`]: "soldOut" })
            .commit();
        }
      }
    }
  }
}

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;

  // Idempotency — Stripe can deliver an event more than once.
  const existing = await sanityEditClient.fetch<string | null>(`*[_type == "order" && stripeSessionId == $id][0]._id`, {
    id: sessionId,
  });
  if (existing) {
    return NextResponse.json({ received: true, deduped: true });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  const cart = parseCart(session.metadata?.cart);

  const lineItems = session.line_items?.data ?? [];
  const skuByIndex = cart.map((c) => c.id);
  const orderItems = lineItems.map((li, i) => ({
    _key: `li${i}`,
    _type: "orderItem",
    label: li.description ?? "Item",
    sku: skuByIndex[i] ?? "",
    qty: li.quantity ?? 1,
    unitPrice: (li.price?.unit_amount ?? 0) / 100,
  }));

  const addr = session.collected_information?.shipping_details?.address ?? session.customer_details?.address ?? null;
  const orderNo = `ORD-${sessionId.slice(-8).toUpperCase()}`;
  const now = new Date();

  // One unique gift-voucher code per voucher unit bought (qty > 1 → one code each). The PDF shows the
  // full face value — if bought on a % sale, un-discount the paid price so the voucher is honoured at
  // its full workshop value.
  const salePct = voucherFor(session.metadata?.voucher)?.percentOff ?? 0;
  const voucherJobs: Array<{ code: string; subject: string; value: number | null }> = [];
  orderItems.forEach((item, i) => {
    if (!isVoucherSku(item.sku)) {
      return;
    }
    const subject = voucherSubject(item.label);
    const paid = item.unitPrice ?? null;
    const faceValue = paid != null && salePct > 0 ? Math.round(paid / (1 - salePct / 100)) : paid;
    for (let unit = 0; unit < (item.qty || 1); unit++) {
      const code = generateVoucherCode({
        voucherSku: item.sku,
        purchasedAt: now,
        uniqueSeed: `${sessionId}:${i}:${unit}`,
      });
      voucherJobs.push({ code, subject, value: faceValue });
    }
  });

  try {
    await sanityEditClient.create({
      _type: "order",
      orderNo,
      placedAt: now.toISOString(),
      status: "paid",
      customerName: session.customer_details?.name ?? session.collected_information?.shipping_details?.name ?? "",
      customerEmail: session.customer_details?.email ?? "",
      shippingAddress: addr
        ? {
            line1: addr.line1 ?? "",
            line2: addr.line2 ?? "",
            postalCode: addr.postal_code ?? "",
            city: addr.city ?? "",
            state: addr.state ?? "",
            country: addr.country ?? "",
          }
        : undefined,
      items: orderItems,
      voucherCodes: voucherJobs.map((job, i) => ({
        _key: `vc${i}`,
        _type: "voucherCode",
        code: job.code,
        label: job.subject,
        redeemed: false,
      })),
      subtotal: (session.amount_subtotal ?? 0) / 100,
      shippingCost: (session.shipping_cost?.amount_total ?? 0) / 100,
      total: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "eur").toUpperCase(),
      stripeSessionId: sessionId,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
    });
  } catch (error) {
    console.error("Webhook: failed to create order doc:", error);
    return NextResponse.json({ error: "Order record failed." }, { status: 500 });
  }

  try {
    await decrementStock(cart);
  } catch (error) {
    // Order is already recorded; a stock-write hiccup shouldn't make Stripe retry (would double nothing
    // but is noisy). Log it so it can be corrected in Studio.
    console.error("Webhook: stock decrement failed:", error);
  }

  // Vouchers: render a signed PDF per code and email them straight to the customer (bcc Joep).
  const customerEmail = session.customer_details?.email ?? "";
  if (voucherJobs.length > 0 && customerEmail && env.RESEND_API_KEY) {
    try {
      const assets = voucherPdfAssets(env.NEXT_PUBLIC_URL);
      const attachments: Array<{ filename: string; content: Buffer }> = [];
      for (const job of voucherJobs) {
        const pdf = await renderVoucherPdf({ code: job.code, subject: job.subject, value: job.value, issuedAt: now }, assets);
        attachments.push({ filename: `voucher-${job.code}.pdf`, content: pdf });
      }
      const firstName = (session.customer_details?.name ?? "").split(" ")[0];
      const many = voucherJobs.length > 1;
      await new Resend(env.RESEND_API_KEY).emails.send({
        from: env.RESEND_EMAIL_FROM || "Joep Hijwegen <onboarding@resend.dev>",
        to: customerEmail,
        bcc: NOTIFY_TO,
        replyTo: NOTIFY_TO,
        subject: many ? "Your vouchers — Joep Hijwegen" : "Your voucher — Joep Hijwegen",
        text: [
          firstName ? `Hi ${firstName},` : "Hi,",
          "",
          `Thank you — your ${many ? "vouchers are" : "voucher is"} attached as ${many ? "PDFs" : "a PDF"}.`,
          "",
          voucherJobs.map((j) => `• ${j.subject} — code ${j.code}`).join("\n"),
          "",
          "Each voucher has a unique code and is redeemable any time — it never expires. To book, just reply to this email with your code and I'll arrange a date and time that suits you. They also make a great gift: forward the PDF to whoever it's for.",
          "",
          "See you soon,",
          "Joep Hijwegen",
          "joephijwegen.com",
        ].join("\n"),
        attachments,
      });
    } catch (error) {
      console.error("Webhook: voucher email failed:", error);
    }
  }

  if (env.RESEND_API_KEY) {
    try {
      const lines = orderItems.map((i) => `  ${i.qty} × ${i.label} — €${i.unitPrice}`).join("\n");
      const a = addr;
      await new Resend(env.RESEND_API_KEY).emails.send({
        from: env.RESEND_EMAIL_FROM || "Orders <onboarding@resend.dev>",
        to: NOTIFY_TO,
        subject: `New order ${orderNo} — €${(session.amount_total ?? 0) / 100}`,
        text: [
          `Order ${orderNo}`,
          `${session.customer_details?.name ?? ""} <${session.customer_details?.email ?? ""}>`,
          "",
          lines,
          "",
          `Subtotal €${(session.amount_subtotal ?? 0) / 100} · Shipping €${(session.shipping_cost?.amount_total ?? 0) / 100} · Total €${(session.amount_total ?? 0) / 100}`,
          "",
          a ? ["Ship to:", a.line1, a.line2, `${a.postal_code ?? ""} ${a.city ?? ""}`, a.country].filter(Boolean).join("\n") : "",
        ].join("\n"),
      });
    } catch (error) {
      console.error("Webhook: order notification email failed:", error);
    }
  }

  return NextResponse.json({ received: true });
}
