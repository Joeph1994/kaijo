import { defineArrayMember, defineField } from "sanity";

export const workshopPricingSection = defineField({
  type: "object",
  name: "workshopPricingSection",
  title: "Workshop Pricing",
  description: "Pricing tiers (with prices or 'on request') plus optional fine print.",
  icon: () => <>💶</>,
  fields: [
    defineField({ name: "heading", type: "string", title: "Heading" }),
    defineField({ name: "lead", type: "text", rows: 3, title: "Lead" }),
    defineField({
      name: "purchase",
      type: "object",
      title: "Add to cart (bookable workshop)",
      description:
        "Set on a specific workshop's page so visitors can book & pay — it adds this workshop to the same cart as books. Leave empty to keep the section enquiry-only.",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({
          name: "name",
          type: "string",
          title: "Cart name",
          description: "How it reads in the cart, e.g. “Cityscapes and Abstracts workshop”.",
        }),
        defineField({ name: "price", type: "number", title: "Price (€)" }),
      ],
    }),
    defineField({
      name: "tiers",
      type: "array",
      title: "Tiers",
      validation: (R) => R.min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "pricingTier",
          fields: [
            defineField({ name: "title", type: "string", title: "Title", validation: (R) => R.required() }),
            defineField({
              name: "price",
              type: "string",
              title: "Price",
              description: "e.g. €250. Leave empty to show “On request”.",
            }),
            defineField({ name: "description", type: "text", rows: 2, title: "Description" }),
            defineField({
              name: "sellAsVoucher",
              type: "boolean",
              title: "Sell directly as a voucher",
              description:
                "Adds a “Buy as voucher” button to this tier, priced from the Price above — for options people can buy without enquiring first. Needs a numeric price (e.g. €250).",
              initialValue: false,
            }),
            defineField({
              name: "voucherNote",
              type: "string",
              title: "Voucher note",
              description: "Small line under the Buy button, e.g. “Emailed as a gift voucher, valid 12 months.”",
              hidden: ({ parent }) => !(parent as { sellAsVoucher?: boolean })?.sellAsVoucher,
            }),
          ],
          preview: { select: { title: "title", subtitle: "price" } },
        }),
      ],
    }),
    defineField({
      name: "note",
      type: "text",
      rows: 2,
      title: "Fine print",
      description: "Optional note shown below the tiers (travel, vouchers, etc.).",
    }),
    defineField({
      name: "bookingHeading",
      type: "string",
      title: "Booking box — heading",
      description: "Heading of the enquiry box beside the tiers.",
    }),
    defineField({
      name: "bookingIntro",
      type: "text",
      rows: 2,
      title: "Booking box — intro",
    }),
    defineField({
      name: "bookingExtraOptions",
      type: "array",
      title: "Booking box — extra options",
      description: "Extra dropdown choices beyond the tiers above (e.g. Gift voucher).",
      of: [{ type: "string" }],
    }),
  ],
  preview: {
    select: { title: "heading" },
    prepare({ title }) {
      return { title: title || "Workshop Pricing", subtitle: "Workshop Pricing" };
    },
  },
});
