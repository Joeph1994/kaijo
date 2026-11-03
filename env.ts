import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod/mini";
import { SANITY_STUDIO_APP_BASE_PATH } from "~/sanity/constants";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
    NEXT_PUBLIC_UNAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UNAMI_WEBSITE_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_EMAIL_FROM: process.env.RESEND_EMAIL_FROM,
    SANITY_API_VIEW_TOKEN: process.env.SANITY_API_VIEW_TOKEN,
    SANITY_API_EDIT_TOKEN: process.env.SANITY_API_EDIT_TOKEN,
    SANITY_REVALIDATE_SECRET: process.env.SANITY_REVALIDATE_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    NEXT_PUBLIC_SANITY_STUDIO_BASE_PATH: process.env.NEXT_PUBLIC_SANITY_STUDIO_BASE_PATH,
    BASIC_AUTH_USERNAME: process.env.BASIC_AUTH_USERNAME,
    BASIC_AUTH_PASSWORD: process.env.BASIC_AUTH_PASSWORD,
  },
  server: {
    RESEND_API_KEY: z.optional(z.string()),
    RESEND_EMAIL_FROM: z.optional(z.string()),
    SANITY_API_VIEW_TOKEN: z.string(),
    SANITY_API_EDIT_TOKEN: z.string(),
    SANITY_REVALIDATE_SECRET: z.string(),
    STRIPE_SECRET_KEY: z.optional(z.string()),
    BASIC_AUTH_USERNAME: z.optional(z.string()),
    BASIC_AUTH_PASSWORD: z.optional(z.string()),
  },
  client: {
    NEXT_PUBLIC_URL: z.url(),
    NEXT_PUBLIC_UNAMI_WEBSITE_ID: z.optional(z.string()),
    NEXT_PUBLIC_SANITY_DATASET: z.string(),
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string(),
    NEXT_PUBLIC_SANITY_API_VERSION: z.string(),
    NEXT_PUBLIC_SANITY_STUDIO_BASE_PATH: z.string().check(
      z.refine(
        (val) => {
          const t = val.trim();
          const withLeading = t.startsWith("/") ? t : `/${t}`;
          const normalized = withLeading.replace(/\/$/, "");
          return normalized !== SANITY_STUDIO_APP_BASE_PATH;
        },
        { error: `Public Studio path must not match the internal route ${SANITY_STUDIO_APP_BASE_PATH}` }
      )
    ),
  },
});
