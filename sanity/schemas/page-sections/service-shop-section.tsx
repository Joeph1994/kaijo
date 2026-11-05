import { defineArrayMember, defineField } from "sanity";

export const serviceShopSection = defineField({
  type: "object",
  name: "serviceShopSection",
  title: "Service Shop",
  description:
    "A grid of buyable workshops/services at set prices, plus an optional custom-amount option. Adds to the same cart as books.",
  icon: () => <>🛒</>,
  fields: [
    defineField({ name: "heading", type: "string", title: "Heading" }),
    defineField({ name: "intro", type: "text", rows: 3, title: "Intro" }),
    defineField({
      name: "layout",
      type: "string",
      title: "Layout",
      description: "Dropdown: one menu to pick an option (best for a hidden, post-enquiry shop). Grid: a card per option.",
      options: {
        list: [
          { title: "Dropdown menu", value: "dropdown" },
          { title: "Grid of cards", value: "grid" },
        ],
        layout: "radio",
      },
      initialValue: "dropdown",
    }),
    defineField({
      name: "items",
      type: "array",
      title: "Items (set price)",
      description: "Workshops and services people can add to the cart at a fixed price.",
      of: [
        defineArrayMember({
          type: "object",
          name: "serviceShopItem",
          fields: [
            defineField({ name: "name", type: "string", title: "Name", validation: (R) => R.required() }),
            defineField({ name: "price", type: "number", title: "Price (€)", validation: (R) => R.required().min(0) }),
            defineField({
              name: "note",
              type: "string",
              title: "Note",
              description: "Optional one-line detail (duration, what's included).",
            }),
            defineField({
              name: "group",
              type: "string",
              title: "Group",
              description: "Optional heading this option sits under in the dropdown (e.g. “Private workshops”).",
            }),
          ],
          preview: {
            select: { title: "name", price: "price" },
            prepare({ title, price }) {
              return { title: title || "Item", subtitle: price != null ? `€${price}` : "No price" };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "customEnabled",
      type: "boolean",
      title: "Show custom-amount option",
      description: "A card where the buyer enters an agreed amount — for tailored or one-off services.",
      initialValue: true,
    }),
    defineField({
      name: "customLabel",
      type: "string",
      title: "Custom option — label",
      initialValue: "Custom / other service",
    }),
    defineField({
      name: "customNote",
      type: "text",
      rows: 2,
      title: "Custom option — note",
      description: "Shown under the custom option, e.g. “Enter the amount we agreed by email.”",
    }),
    defineField({
      name: "footnote",
      type: "text",
      rows: 2,
      title: "Footnote",
      description: "Optional fine print below the items.",
    }),
  ],
  preview: {
    select: { title: "heading" },
    prepare({ title }) {
      return { title: title || "Service Shop", subtitle: "Service Shop" };
    },
  },
});
