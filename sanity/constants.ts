/** Studio's fixed filesystem segment. The public URL is `NEXT_PUBLIC_SANITY_STUDIO_BASE_PATH` (not this); use the env for reserved-URI checks and `basePath`. */
export const SANITY_STUDIO_APP_SEGMENT = "sanity-studio" as const;
export const SANITY_STUDIO_APP_BASE_PATH = `/${SANITY_STUDIO_APP_SEGMENT}` as const;

export const TEMPLATE_IDS = {
  pageSingleton: "pageSingletonTemplate",
} as const;

/** Singleton IDs as string literals (typegen resolves only literals, not member access); derive `SINGLETON_IDS` from these. */
export const SANITY_SINGLETON_SITE_ID = "site";
export const SANITY_SINGLETON_HOMEPAGE_ID = "homepage";
export const SANITY_SINGLETON_STORE_STOCK_ID = "storeStock";

/** The unified Prints & Books page. The books section renders the store sub-nav when it lives here. */
export const SANITY_STORE_PAGE_ID = "page-store";

export const SINGLETON_IDS = {
  site: SANITY_SINGLETON_SITE_ID,
  homepage: SANITY_SINGLETON_HOMEPAGE_ID,
  storeStock: SANITY_SINGLETON_STORE_STOCK_ID,
  // PLOP: Add Singleton ID
} as const;

/** Singleton URIs, used for `initialValueTemplate` when creating/opening singleton pages. */
export const SINGLETON_ROUTES = {
  [SINGLETON_IDS.homepage]: "/",
  // PLOP: Add Singleton Route
} as const;

/** Submission schema types; only delete and discardChanges are allowed in the Studio. */
export const API_ONLY_DOCUMENTS = {
  contactFormSubmission: "contactFormSubmission",
} as const;

/** Routed non-singleton `_type` names; use these literal bindings in `defineQuery` interpolations (typegen won't resolve member access). Site's `_type` is `SANITY_SINGLETON_SITE_ID`, also its `revalidateTag`. */
export const SANITY_PAGE_DOCUMENT_TYPE = "page" as const;
export const SANITY_PROJECT_DOCUMENT_TYPE = "project" as const;
/** Password-gated client lookbooks at /portfolio/<slug>. Never indexed, never in nav; images are opted in per-photo. */
export const SANITY_PORTFOLIO_DOCUMENT_TYPE = "portfolio" as const;
/** Paid orders, created by the Stripe webhook; editable in Studio for fulfilment (status, tracking). */
export const SANITY_ORDER_DOCUMENT_TYPE = "order" as const;

/**
 * The fixed Work sub-categories. The value is also the label shown under a project title, and is
 * what the Portfolio Grid section filters on and the /work sub-pages list. Shared by the project
 * and portfolio-grid schemas so the two stay in sync; add an entry here to introduce a category.
 */
export const WORK_CATEGORIES = ["Projects", "Commissions"] as const;

/** `options.list` entries for a Work-category string field. */
export const WORK_CATEGORY_OPTIONS = WORK_CATEGORIES.map((value) => ({ title: value, value }));
