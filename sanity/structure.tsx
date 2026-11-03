import * as changeCase from "change-case";
import type { StructureBuilder } from "sanity/structure";
import { sanityConfig } from "./config";
import { API_ONLY_DOCUMENTS, SINGLETON_IDS, TEMPLATE_IDS } from "./constants";

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

      S.listItem()
        .title("Books")
        .icon(() => <>📄</>)
        .child(S.documentTypeList("book").title("Books")),

      S.listItem()
        .title("Orders")
        .icon(() => <>🧾</>)
        .child(
          S.documentTypeList("order")
            .title("Orders")
            .defaultOrdering([{ field: "placedAt", direction: "desc" }])
        ),

      singleton(S, {
        title: "Print stock",
        schemaType: "storeStock",
        documentId: SINGLETON_IDS.storeStock,
        icon: () => <>📦</>,
      }),

      // PLOP: Add Structure

      S.divider(),

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

      // Form Submissions (driven by API_ONLY_DOCUMENTS)
      S.listItem()
        .title("Form Submissions")
        .icon(() => <>📥</>)
        .child(
          S.list()
            .title("Form Submissions")
            .items(
              Object.values(API_ONLY_DOCUMENTS).map((schemaType) =>
                S.listItem()
                  .title(changeCase.capitalCase(schemaType))
                  .icon(() => <>📩</>)
                  .child(S.documentTypeList(schemaType).title(changeCase.capitalCase(schemaType)))
              )
            )
        ),

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
