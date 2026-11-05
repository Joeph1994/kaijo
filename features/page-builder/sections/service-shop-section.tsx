import { defineQuery, stegaClean } from "next-sanity";
import { sanityFetch } from "~/features/sanity/client";
import { ServiceShop } from "~/features/store/service-shop";
import type { ServiceShopSectionQResult } from "~/sanity/types";

const ServiceShopSectionQ =
  defineQuery(`*[_id == $docId][0].pageBuilder.sectionsArray[_type == "serviceShopSectionField" && _key == $sectionKey][0]{
    "content": sectionContent{
      heading,
      intro,
      layout,
      items[]{ name, price, note, group },
      customEnabled,
      customLabel,
      customNote,
      footnote,
    },
    "settings": sectionSettings{
      "hash": coalesce(sectionHash.current, _key),
    },
}`);

export async function ServiceShopSection({ docId, sectionKey }: { docId: string; sectionKey: string }) {
  const section = await sanityFetch<ServiceShopSectionQResult>({
    query: ServiceShopSectionQ,
    params: { docId, sectionKey },
    options: { next: { tags: [`doc:${docId}`] } },
  });

  const content = section?.content;

  if (!content) {
    return null;
  }

  const items = (content.items ?? [])
    .filter((item) => Boolean(item?.name) && typeof item?.price === "number")
    .map((item) => ({
      name: item.name as string,
      price: item.price as number,
      note: item.note ?? null,
      group: item.group ?? null,
    }));

  const layout = content.layout === "grid" ? "grid" : "dropdown";

  return (
    <div
      id={stegaClean(section.settings?.hash)}
      data-page-builder-section="serviceShopSection"
      className="section_service-shop section-padding-top"
    >
      <div className="container">
        <div className="vertical_layout">
          {content.heading && (
            <h2 data-scramble="scroll" className="section_title">
              {content.heading}
            </h2>
          )}
          {content.intro && <p className="service-shop_intro">{content.intro}</p>}
          <ServiceShop
            items={items}
            layout={layout}
            customEnabled={content.customEnabled ?? false}
            customLabel={content.customLabel ?? null}
            customNote={content.customNote ?? null}
          />
          {content.footnote && <p className="service-shop_footnote">{content.footnote}</p>}
        </div>
      </div>
    </div>
  );
}
