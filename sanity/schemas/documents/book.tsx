import { defineArrayMember, defineField, defineType } from "sanity";
import { createSeoField } from "../fields/create-seo-field";
import { createUriField } from "../fields/create-uri-field";

export const book = defineType({
  __experimental_formPreviewTitle: false,
  name: "book",
  type: "document",
  title: "Book",
  icon: () => <>📕</>,
  groups: [
    { name: "details", title: "Details", icon: () => <>📄</>, default: true },
    { name: "media", title: "Media", icon: () => <>🖼</> },
    { name: "seo", title: "SEO", icon: () => <>🔍</> },
  ],
  fields: [
    defineField({
      group: "details",
      name: "title",
      type: "string",
      title: "Title",
      validation: (R) => R.required(),
    }),
    createUriField({
      group: "details",
      source: "title",
      slugify: ({ slug }) => `/books/${slug}`,
      validation: (R) => R.required(),
    }),
    defineField({
      group: "details",
      name: "year",
      type: "string",
      title: "Publication year",
    }),
    defineField({
      group: "details",
      name: "shortDescription",
      type: "text",
      rows: 5,
      title: "Short description",
      description: "Roughly 80–150 words: what the book is, the project it relates to, key production context.",
      validation: (R) => R.required(),
    }),
    defineField({
      group: "details",
      name: "variants",
      type: "array",
      title: "Editions",
      description: "Each edition with its own price and availability (e.g. Standard, Signed, Special edition).",
      validation: (R) => R.min(1),
      of: [
        defineArrayMember({
          type: "object",
          name: "bookVariant",
          fields: [
            defineField({ name: "name", type: "string", title: "Edition name", validation: (R) => R.required() }),
            defineField({ name: "price", type: "number", title: "Price (EUR)", validation: (R) => R.required().min(0) }),
            defineField({
              name: "image",
              type: "image",
              title: "Edition image",
              description: "Shown at the top of the book page when this edition is selected. Falls back to the cover image.",
            }),
            defineField({
              name: "availability",
              type: "string",
              title: "Availability",
              options: {
                list: [
                  { title: "Available", value: "available" },
                  { title: "Limited copies available", value: "limited" },
                  { title: "Sold out", value: "soldOut" },
                ],
                layout: "radio",
              },
              initialValue: "available",
            }),
            defineField({ name: "sku", type: "string", title: "SKU" }),
            defineField({
              name: "stock",
              type: "number",
              title: "Stock",
              description: "Copies remaining. Checkout blocks this edition at 0; the webhook decrements it per paid order.",
              validation: (R) => R.min(0),
            }),
          ],
          preview: {
            select: { title: "name", price: "price", media: "image" },
            prepare({ title, price, media }) {
              return { title: title || "Edition", subtitle: typeof price === "number" ? `€${price}` : "", media };
            },
          },
        }),
      ],
    }),
    defineField({
      group: "details",
      name: "specifications",
      type: "array",
      title: "Specifications",
      description: "Small, quiet spec block. Add only useful rows (Published, Pages, Dimensions, Binding, Edition, Language, …).",
      of: [
        defineArrayMember({
          type: "object",
          name: "spec",
          fields: [
            defineField({ name: "label", type: "string", title: "Label", validation: (R) => R.required() }),
            defineField({ name: "value", type: "string", title: "Value", validation: (R) => R.required() }),
          ],
          preview: { select: { title: "label", subtitle: "value" } },
        }),
      ],
    }),
    defineField({
      group: "details",
      name: "relatedProject",
      type: "reference",
      title: "Related project",
      to: [{ type: "project" }],
      description: "The photographic project this book relates to (links both ways).",
    }),
    defineField({
      group: "details",
      name: "order",
      type: "number",
      title: "Order",
      description: "Manual ordering on the Books page (lower comes first).",
    }),
    defineField({
      group: "media",
      name: "coverImage",
      type: "image",
      title: "Cover / main image",
      description: "A strong photograph of the physical book (or the cover). Shown on the Books page and the book header.",
      validation: (R) => R.required(),
    }),
    defineField({
      group: "media",
      name: "images",
      type: "array",
      title: "Images",
      description: "A restrained selection (~5–10): cover, back/spine, the book as object, selected spreads, a detail or two.",
      of: [{ type: "image" }],
    }),
    createSeoField({ group: "seo" }),
  ],
  orderings: [{ title: "Order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "title", subtitle: "year", media: "coverImage" },
  },
});
