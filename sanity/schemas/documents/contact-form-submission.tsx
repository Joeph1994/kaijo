import { defineField, defineType } from "sanity";

/**
 * An enquiry from one of the site forms (contact, workshop, print). Created by the `/api/*-enquiry`
 * routes — the data fields are read-only; only "Replied" is editable so Joep can tick it off after
 * answering. Delivery is still by email; this is the Studio record.
 */
export const contactFormSubmission = defineType({
  name: "contactFormSubmission",
  type: "document",
  title: "Enquiry",
  icon: () => <>📧</>,
  fields: [
    defineField({
      name: "kind",
      type: "string",
      title: "Type",
      readOnly: true,
      options: {
        list: [
          { title: "Contact", value: "contact" },
          { title: "Workshop", value: "workshop" },
          { title: "Print", value: "print" },
        ],
      },
    }),
    defineField({ name: "subject", type: "string", title: "Subject", readOnly: true }),
    defineField({ name: "email", type: "string", title: "From (email)", readOnly: true }),
    defineField({
      name: "size",
      type: "string",
      title: "Size",
      readOnly: true,
      hidden: ({ parent }) => (parent as { kind?: string })?.kind !== "print",
    }),
    defineField({ name: "message", type: "text", rows: 6, title: "Message", readOnly: true }),
    defineField({ name: "receivedAt", type: "datetime", title: "Received", readOnly: true }),
    defineField({
      name: "replied",
      type: "boolean",
      title: "Replied",
      description: "Tick once you've answered. Remember to Publish to save it.",
      initialValue: false,
    }),
  ],
  orderings: [{ title: "Newest first", name: "newest", by: [{ field: "receivedAt", direction: "desc" }] }],
  preview: {
    select: { kind: "kind", subject: "subject", email: "email", replied: "replied", receivedAt: "receivedAt" },
    prepare: ({ kind, subject, email, replied, receivedAt }) => {
      const label = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Enquiry";
      const when = receivedAt ? new Date(receivedAt).toLocaleDateString() : "";
      return {
        title: `${replied ? "✓ " : ""}${subject || email || "Enquiry"}`,
        subtitle: [label, email, when].filter(Boolean).join(" · "),
      };
    },
  },
});
