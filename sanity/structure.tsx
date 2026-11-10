import type { StructureBuilder } from "sanity/structure";
import { StoreOverview } from "./components/store-overview";
import { sanityConfig } from "./config";
import { SINGLETON_IDS, TEMPLATE_IDS } from "./constants";

/**
 * Create a list item that maps to a single document.
 * Optionally provide `initialValueTemplate` to prefill the document (e.g. homepage title; URI is set in the template).
 */
function singleton(
  S: StructureBuilder,
  {
    icon,
    title,
    schemaType,
    documentId,
    initialValueTemplate,
  }: {
    title: string;
    schemaType: string;
    documentId: string;
    icon?: () => React.ReactNode;
    initialValueTemplate?: { templateId: string; parameters?: Record<string, unknown> };
  }
) {
  let doc = S.document().schemaType(schemaType).documentId(documentId).title(title);

  if (initialValueTemplate) {
    const { templateId, parameters } = initialValueTemplate;
    doc = doc.initialValueTemplate(templateId, parameters);
  }

  return S.listItem().title(title).id(documentId).icon(icon).child(doc);
}

/**
 * The Store hub — one place for the shop: an at-a-glance Overview plus Orders, Enquiries, Books and
 * Print stock as tabs. Mirrors the "shop overview" feel of a hosted store.
 */
function storeHub(S: StructureBuilder) {
  return S.listItem()
    .title("Store")
    .id("store")
    .icon(() => <>🛍️</>)
    .child(
      S.list()
        .title("Store")
        .items([
          S.listItem()
            .title("Overview")
            .id("store-overview")
            .icon(() => <>📊</>)
            .child(S.component(StoreOverview).title("Overview").id("store-overview")),

          S.listItem()
            .title("Orders")
            .icon(() => <>🧾</>)
            .child(
              S.documentTypeList("order")
                .title("Orders")
                .defaultOrdering([{ field: "placedAt", direction: "desc" }])
            ),

          S.listItem()
            .title("Enquiries")
            .icon(() => <>📧</>)
            .child(
              S.documentTypeList("contactFormSubmission")
                .title("Enquiries")
                .defaultOrdering([{ field: "receivedAt", direction: "desc" }])
            ),

          S.divider(),

          S.listItem()
            .title("Books")
            .icon(() => <>📄</>)
            .child(S.documentTypeList("book").title("Books")),

          singleton(S, {
            title: "Print stock",
            schemaType: "storeStock",
            documentId: SINGLETON_IDS.storeStock,
            icon: () => <>📦</>,
          }),
        ])
    );
}

export function buildStructure(S: StructureBuilder) {
  return S.list()
    .title("The Content Architecture")
    .items([
      // Homepage
      singleton(S, {
        title: "Homepage",
        schemaType: "page",
        documentId: SINGLETON_IDS.homepage,
        icon: () => <>🏠</>,
        initialValueTemplate: {
          templateId: TEMPLATE_IDS.pageSingleton,
          parameters: { title: "Homepage" },
        },
      }),

      // All other pages (excludes singletons)
      S.listItem()
        .title("Pages")
        .icon(() => <>📑</>)
        .child(
          S.documentTypeList("page")
            .title("Pages")
            .apiVersion(sanityConfig.apiVersion)
            .filter(
              `_type == 'page' && !(_id in [${Object.values(SINGLETON_IDS)
                .map((id) => `'${id}'`)
                .join(",")}])`
            )
        ),

      // Projects
      S.listItem()
        .title("Projects")
        .icon(() => <>📷</>)
        .child(
          S.documentTypeList("project")
            .title("Projects")
            .defaultOrdering([{ field: "date", direction: "asc" }])
        ),

      // Private client lookbooks (password-gated, unlisted)
      S.listItem()
        .title("Portfolios")
        .icon(() => <>🔒</>)
        .child(S.documentTypeList("portfolio").title("Portfolios")),

      S.divider(),

      // PLOP: Add Structure
      storeHub(S),

      S.divider(),

      // Site
      singleton(S, {
        title: "Site",
        schemaType: "site",
        documentId: SINGLETON_IDS.site,
        icon: () => <>🎫</>,
      }),
    ]);
}
