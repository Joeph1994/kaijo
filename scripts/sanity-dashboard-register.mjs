// Keeps the self-hosted Studio registered with the Sanity Dashboard on every production deploy:
// re-deploys the schema (schema-aware search + Content Agent) and re-registers the external Studio
// so its manifest stays fresh. Runs from the `build` script before `next build`.
//
// Guarded so it only acts on Vercel production builds that have a deploy token, and it NEVER fails
// the build — a Sanity hiccup must not block the site from shipping.
//
// Requires a Sanity token with the "Deploy Studio" grant, set in Vercel as SANITY_DEPLOY_TOKEN
// (Production). Without it, this step simply skips.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// The exact public URL the Studio is registered under (must match — the site canonicalises to www).
const STUDIO_URL = "https://www.joephijwegen.com/studio";

const vercelEnv = process.env.VERCEL_ENV;
const token = process.env.SANITY_DEPLOY_TOKEN || process.env.SANITY_AUTH_TOKEN;

function skip(reason) {
  console.log(`[sanity-dashboard] skipped (${reason})`);
  process.exit(0);
}

// Only on Vercel *production* builds. Preview/dev deploys have other URLs and must not re-register.
if (vercelEnv && vercelEnv !== "production") {
  skip(`VERCEL_ENV=${vercelEnv}`);
}
if (!token) {
  skip("no SANITY_DEPLOY_TOKEN");
}

const bin = path.join(process.cwd(), "node_modules", ".bin", "sanity");
if (!existsSync(bin)) {
  skip("sanity CLI not found");
}

const childEnv = { ...process.env, SANITY_AUTH_TOKEN: token };

function run(args) {
  console.log(`[sanity-dashboard] sanity ${args.join(" ")}`);
  const res = spawnSync(bin, args, { stdio: "inherit", env: childEnv });
  if (res.status !== 0) {
    // Non-fatal: log and carry on so the deploy still ships.
    console.warn(`[sanity-dashboard] "sanity ${args.join(" ")}" exited ${res.status ?? "via signal"} — continuing`);
  }
}

run(["schema", "deploy"]);
run(["deploy", "--external", "--url", STUDIO_URL, "--yes"]);
process.exit(0);
