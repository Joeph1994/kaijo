import type { Metadata } from "next";
import { seo } from "~/features/site/seo/utils";
import { SiteShell } from "~/features/site/site-shell";
import { CheckoutSuccess } from "~/features/store/checkout-success";

export async function generateMetadata(): Promise<Metadata> {
  return await seo({ title: "Thank you", robots: "noindex, nofollow" });
}

export default function CheckoutSuccessPage() {
  return (
    <SiteShell>
      <CheckoutSuccess />
    </SiteShell>
  );
}
