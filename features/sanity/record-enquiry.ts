import { sanityEditClient } from "~/features/sanity/client";

type EnquiryKind = "contact" | "workshop" | "print";

/**
 * Record a site enquiry as a `contactFormSubmission` document so it shows in Studio → Enquiries.
 * Non-fatal: the email is the primary delivery, so a Sanity write hiccup must never fail the enquiry.
 */
export async function recordEnquiry(input: {
  kind: EnquiryKind;
  subject: string;
  email: string;
  message: string;
  size?: string | null;
}): Promise<void> {
  try {
    await sanityEditClient.create({
      _type: "contactFormSubmission",
      kind: input.kind,
      subject: input.subject,
      email: input.email,
      message: input.message,
      ...(input.size ? { size: input.size } : {}),
      receivedAt: new Date().toISOString(),
      replied: false,
    });
  } catch (error) {
    console.error("recordEnquiry failed:", error);
  }
}
