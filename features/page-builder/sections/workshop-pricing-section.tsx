import { defineQuery, stegaClean } from "next-sanity";
import { sanityFetch } from "~/features/sanity/client";
import { parseEuroPrice } from "~/features/store/services";
import { VoucherPurchase } from "~/features/store/voucher-purchase";
import { WorkshopPurchase } from "~/features/store/workshop-purchase";
import type { WorkshopPricingSectionQResult } from "~/sanity/types";
import { WorkshopBookingForm } from "./workshop-booking-form";

const WorkshopPricingSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "workshopPricingSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      heading,
      lead,
      purchase,
      tiers[]{ "key": _key, title, price, description, sellAsVoucher, voucherNote },
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

  // A bookable workshop (name + price set) shows a "Book & pay" → cart action; the enquiry form then
  // becomes the "ask a question first" path. Without it the section stays enquiry-only (the overview).
  const purchaseName = stegaClean(content.purchase?.name ?? "");
  const purchasePrice = content.purchase?.price;
  const purchasable = Boolean(purchaseName) && typeof purchasePrice === "number";

  // The booking cell (and the #enquire anchor) only show when this block is an enquiry/booking block;
  // a second pricing block (e.g. "Coaching options") without a booking heading renders as tiers only.
  const showBooking = Boolean(content.bookingHeading) || purchasable;

  return (
    <div id={showBooking ? "enquire" : undefined} className="section_workshop-pricing section-padding-top">
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
          {content.tiers.map((tier) => {
            // A tier flagged "sell as voucher" with a numeric price gets a direct Buy button; the
            // rest stay display-only (enquire via the booking box).
            const voucherPrice = tier.sellAsVoucher ? parseEuroPrice(tier.price) : null;
            return (
              <div key={tier.key} className="workshop-pricing_tier">
                <span className="workshop-pricing_tier-price">{tier.price || "On request"}</span>
                <span className="workshop-pricing_tier-title">{tier.title}</span>
                {tier.description && <p className="workshop-pricing_tier-desc">{tier.description}</p>}
                {voucherPrice != null && (
                  <VoucherPurchase label={stegaClean(tier.title) ?? ""} price={voucherPrice} note={tier.voucherNote} />
                )}
              </div>
            );
          })}
          {showBooking && (
            <div className="workshop-booking-cell">
              {purchasable && purchasePrice != null && (
                <WorkshopPurchase id={docId} name={purchaseName} session={content.lead} price={purchasePrice} />
              )}
              <WorkshopBookingForm
                heading={purchasable ? "Prefer to ask first?" : content.bookingHeading}
                intro={purchasable ? "Not ready to book — send a question and I'll reply by email." : content.bookingIntro}
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
