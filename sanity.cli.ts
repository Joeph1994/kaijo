import { defineCliConfig } from "sanity/cli";
import { env } from "~/env";

export default defineCliConfig({
  api: {
    dataset: env.NEXT_PUBLIC_SANITY_DATASET,
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  },
  // Registered external (self-hosted) Studio at /studio, so it's compatible with the Sanity
  // Dashboard. Re-run `sanity deploy --external --url …/studio` + `sanity schema deploy` to refresh.
  deployment: {
    appId: "a8xtf7b1wzh4e04x2ntx2gxc",
  },
  typegen: {
    path: ["./**/*.{ts,tsx}", "!./node_modules/**"],
    schema: "./sanity-schema.json",
    generates: "./sanity/types.ts",
    overloadClientMethods: false,
  },
});
