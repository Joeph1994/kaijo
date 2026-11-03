import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Singleton stock counter for the exhibition prints (which live in code, not as book docs). The
 * Stripe webhook decrements `stock` by SKU on each paid order; a set purchase (`print:wor:set`) also
 * reduces every single by 1. Edit the numbers here to restock or correct.
 */
export const storeStock = defineType({
  name: "storeStock",
  type: "document",
  title: "Print stock",
  icon: () => <>📦</>,
  fields: [
    defineField({
      name: "items",
      type: "array",
      title: "Stock",
      of: [
        defineArrayMember({
          type: "object",
          name: "stockItem",
          fields: [
            defineField({ name: "sku", type: "string", title: "SKU", readOnly: true }),
            defineField({ name: "label", type: "string", title: "Label", readOnly: true }),
            defineField({ name: "stock", type: "number", title: "Stock", validation: (R) => R.min(0) }),
          ],
          preview: {
            select: { title: "label", sku: "sku", stock: "stock" },
            prepare: ({ title, sku, stock }) => ({ title: title || sku, subtitle: `${stock ?? 0} left` }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Print stock" }) },
});
