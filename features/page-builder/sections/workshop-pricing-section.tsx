import { defineQuery, stegaClean } from "next-sanity";
import { sanityFetch } from "~/features/sanity/client";
import { parseEuroPrice } from "~/features/store/services";
import { type VoucherOption, VoucherPicker } from "~/features/store/voucher-picker";
import { WorkshopPurchase } from "~/features/store/workshop-purchase";
import type { WorkshopPricingSectionQResult } from "~/sanity/types";
import { WorkshopBookingForm } from "./workshop-booking-form";

const WorkshopPricingSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "workshopPricingSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      heading,
      lead,
      purchase,
      tiers[]{ "key": _key, title, price, description, sellAsVoucher },
      note,
      bookingHeading,
      bookingIntro,
      bookingExtraOptions
    }
}`);

export async function WorkshopPricingSection({ docId, sectionKey }: { docId: string; sectionKey: string }) {
  const section = await sanityFetch<WorkshopPricingSectionQResult>({
    query: WorkshopPricingSectionQ,
    params: { docId, sectionKey },
    options: { next: { tags: [`doc:${docId}`] } },
  });

  const content = section?.content;

  if (!content?.tiers?.length) {
    return null;
  }

  const tierOptions = content.tiers
    .filter((tier): tier is typeof tier & { title: string } => Boolean(tier.title))
    .map((tier) => (tier.price ? `${tier.title} (${tier.price})` : tier.title));
  const extraOptions = (content.bookingExtraOptions ?? []).filter((option): option is string => Boolean(option));
  const options = [...tierOptions, ...extraOptions];

  // Every set-price tier flagged "sell as voucher" becomes a buy-a-voucher option in the booking box.
  const voucherOptions: VoucherOption[] = content.tiers.flatMap((tier) => {
    const price = tier.sellAsVoucher ? parseEuroPrice(tier.price) : null;
    const label = stegaClean(tier.title ?? "");
    return price != null && label ? [{ label, price }] : [];
  });
  const hasVouchers = voucherOptions.length > 0;

  // A bookable workshop (name + price set) shows a "Book & pay" → cart action; the enquiry form then
  // becomes the "ask a question first" path. Without it the section stays enquiry-only (the overview).
  const purchaseName = stegaClean(content.purchase?.name ?? "");
  const purchasePrice = content.purchase?.price;
  const purchasable = Boolean(purchaseName) && typeof purchasePrice === "number";

  // Show the booking cell whenever this block can be booked or enquired about. Only a block with its
  // own booking heading (or a direct Book & pay) owns the #enquire anchor, so a voucher-only block
  // (e.g. "Coaching options") can share the layout without minting a duplicate id.
  const ownsEnquireAnchor = Boolean(content.bookingHeading) || purchasable;
  const showBooking = ownsEnquireAnchor || hasVouchers;
  // Once a block can be booked directly (voucher or Book & pay), the enquiry form is the secondary
  // "ask first" path rather than the primary call to action.
  const secondaryEnquire = purchasable || hasVouchers;

  return (
    <div id={ownsEnquireAnchor ? "enquire" : undefined} className="section_workshop-pricing section-padding-top">
      <div className="container">
        <div className="workshop-pricing_head">
          {content.heading && (
            <h2 data-scramble="scroll" className="section-eyebrow">
              {content.heading}
            </h2>
          )}
          {content.lead && <p className="workshop-pricing_lead">{content.lead}</p>}
        </div>
        <div className="workshop-pricing_grid">
          {content.tiers.map((tier) => (
            <div key={tier.key} className="workshop-pricing_tier">
              <span className="workshop-pricing_tier-price">{tier.price || "On request"}</span>
              <span className="workshop-pricing_tier-title">{tier.title}</span>
              {tier.description && <p className="workshop-pricing_tier-desc">{tier.description}</p>}
            </div>
          ))}
          {showBooking && (
            <div className="workshop-booking-cell">
              {hasVouchers && <VoucherPicker options={voucherOptions} />}
              {purchasable && purchasePrice != null && (
                <WorkshopPurchase id={docId} name={purchaseName} session={content.lead} price={purchasePrice} />
              )}
              <WorkshopBookingForm
                heading={secondaryEnquire ? "Prefer to ask first?" : content.bookingHeading}
                intro={secondaryEnquire ? "Not ready to book — send a question and I'll reply by email." : content.bookingIntro}
                options={options}
              />
            </div>
          )}
        </div>
        {content.note && <p className="workshop-pricing_note">{content.note}</p>}
      </div>
    </div>
  );
}
