import { book } from "./documents/book";
import { contactFormSubmission } from "./documents/contact-form-submission";
import { order } from "./documents/order";
import { page } from "./documents/page";
import { portfolio } from "./documents/portfolio";
import { project } from "./documents/project";
import { redirect } from "./documents/redirect";
import { site } from "./documents/site";
import { storeStock } from "./documents/store-stock";
import { appColor } from "./fields/app-color";
import { aspectRatio } from "./fields/aspect-ratio";
import { lottieOptions } from "./fields/lottie-options";
import { headerNavItem } from "./fields/nav-item";
import { riveOptions } from "./fields/rive-options";
import { videoOptions } from "./fields/video-options";
import { sections } from "./page-sections";
// PLOP: Add Import

// All exported schema types will be added to Sanity as first-class citizens.
export const schemaTypes = [
  site,
  redirect,
  page,
  project,
  contactFormSubmission,
  aspectRatio,
  videoOptions,
  riveOptions,
  lottieOptions,
  appColor,
  headerNavItem,
  book,
  portfolio,
  order,
  storeStock,
  // PLOP: Add Export
  ...sections,
];
