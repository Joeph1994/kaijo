import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "~/env";
import { recordEnquiry } from "~/features/sanity/record-enquiry";

/** Enquiries are always delivered here — never trust a client-supplied recipient. */
const ENQUIRY_TO = "me@joephijwegen.com";

const EnquirySchema = z.object({
  print: z.string().trim().min(1).max(300),
  size: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: real users leave this empty; if it's filled we silently accept (see below).
  company: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = EnquirySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check the form and try again." }, { status: 400 });
  }

  const { print, size, email, message, company } = parsed.data;

  // Silently accept honeypot hits so bots get no signal.
  if (company) {
    return NextResponse.json({ ok: true });
  }

  if (!env.RESEND_API_KEY) {
    console.error("Print enquiry: RESEND_API_KEY is not set.");
    return NextResponse.json({ ok: false, error: "Enquiries are temporarily unavailable." }, { status: 503 });
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: env.RESEND_EMAIL_FROM || "Prints <onboarding@resend.dev>",
    to: ENQUIRY_TO,
    replyTo: email,
    subject: `Print enquiry — ${print}`,
    text: [`Print: ${print}`, size ? `Size: ${size}` : null, `From: ${email}`, "", message].filter(Boolean).join("\n"),
  });

  if (error) {
    console.error("Print enquiry: Resend error", error);
    return NextResponse.json({ ok: false, error: "Something went wrong sending your enquiry." }, { status: 502 });
  }

  await recordEnquiry({ kind: "print", subject: print, email, message, size });

  return NextResponse.json({ ok: true });
}
