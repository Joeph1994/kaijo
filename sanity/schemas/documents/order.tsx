import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * A paid order, created by the Stripe webhook (`app/api/stripe-webhook`). Most fields are read-only
 * (set from the payment); `status` and `trackingNumber` are editable for fulfilment.
 */
export const order = defineType({
  name: "order",
  type: "document",
  title: "Order",
  icon: () => <>🧾</>,
  fields: [
    defineField({ name: "orderNo", type: "string", title: "Order no.", readOnly: true }),
    defineField({ name: "placedAt", type: "datetime", title: "Placed at", readOnly: true }),
    defineField({
      name: "status",
      type: "string",
      title: "Status",
      options: {
        list: [
          { title: "Paid", value: "paid" },
          { title: "Shipped", value: "shipped" },
          { title: "Refunded", value: "refunded" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
      initialValue: "paid",
    }),
    defineField({ name: "trackingNumber", type: "string", title: "Tracking number" }),
    defineField({ name: "customerName", type: "string", title: "Customer name", readOnly: true }),
    defineField({ name: "customerEmail", type: "string", title: "Customer email", readOnly: true }),
    defineField({
      name: "shippingAddress",
      type: "object",
      title: "Shipping address",
      readOnly: true,
      fields: [
        defineField({ name: "line1", type: "string", title: "Line 1" }),
        defineField({ name: "line2", type: "string", title: "Line 2" }),
        defineField({ name: "postalCode", type: "string", title: "Postal code" }),
        defineField({ name: "city", type: "string", title: "City" }),
        defineField({ name: "state", type: "string", title: "State / province" }),
        defineField({ name: "country", type: "string", title: "Country" }),
      ],
    }),
    defineField({
      name: "items",
      type: "array",
      title: "Items",
      readOnly: true,
      of: [
        defineArrayMember({
          type: "object",
          name: "orderItem",
          fields: [
            defineField({ name: "label", type: "string", title: "Item" }),
            defineField({ name: "sku", type: "string", title: "SKU" }),
            defineField({ name: "qty", type: "number", title: "Qty" }),
            defineField({ name: "unitPrice", type: "number", title: "Unit price (EUR)" }),
          ],
          preview: {
            select: { title: "label", qty: "qty", unitPrice: "unitPrice" },
            prepare: ({ title, qty, unitPrice }) => ({ title, subtitle: `${qty} × €${unitPrice}` }),
          },
        }),
      ],
    }),
    defineField({
      name: "voucherCodes",
      type: "array",
      title: "Vouchers issued",
      description: "Unique gift-voucher codes emailed to the customer. Tick one as redeemed when it's been used.",
      of: [
        defineArrayMember({
          type: "object",
          name: "voucherCode",
          fields: [
            defineField({ name: "code", type: "string", title: "Code", readOnly: true }),
            defineField({ name: "label", type: "string", title: "For", readOnly: true }),
            defineField({ name: "redeemed", type: "boolean", title: "Redeemed", initialValue: false }),
          ],
          preview: {
            select: { title: "code", subtitle: "label", redeemed: "redeemed" },
            prepare: ({ title, subtitle, redeemed }) => ({
              title: `${redeemed ? "✓ " : ""}${title ?? "Voucher"}`,
              subtitle: subtitle ?? "",
            }),
          },
        }),
      ],
    }),
    defineField({ name: "subtotal", type: "number", title: "Subtotal (EUR)", readOnly: true }),
    defineField({ name: "shippingCost", type: "number", title: "Shipping (EUR)", readOnly: true }),
    defineField({ name: "total", type: "number", title: "Total (EUR)", readOnly: true }),
    defineField({ name: "currency", type: "string", title: "Currency", readOnly: true }),
    defineField({ name: "stripeSessionId", type: "string", title: "Stripe session id", readOnly: true }),
    defineField({ name: "stripePaymentIntentId", type: "string", title: "Stripe payment id", readOnly: true }),
  ],
  orderings: [{ title: "Newest first", name: "newest", by: [{ field: "placedAt", direction: "desc" }] }],
  preview: {
    select: { orderNo: "orderNo", name: "customerName", total: "total", status: "status", placedAt: "placedAt" },
    prepare: ({ orderNo, name, total, status, placedAt }) => ({
      title: `${orderNo ?? "Order"}${name ? ` — ${name}` : ""}`,
      subtitle: `€${total ?? "?"} · ${status ?? "paid"}${placedAt ? ` · ${new Date(placedAt).toLocaleDateString()}` : ""}`,
    }),
  },
});
