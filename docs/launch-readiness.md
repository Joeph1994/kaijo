# Launch readiness — joephijwegen.com

A screening of the site before going live: technical health, the visitor experience, what's
left to finalize, and how to move the domain off Squarespace without losing traffic.

> Interactive version (tickable, themed): the "Launch readiness — joephijwegen.com" artifact
> on claude.ai. This Markdown copy is the durable, version-controlled source of truth.

**Status:** production build green (61 pages, types + lint clean); no console errors on any page
tested. Nothing blocking except the store-checkout decision. The domain move is the critical path.

---

## 1. Technical findings

### Decide before launch
- **Store checkout is email-only — no payment backend.** The cart works, but "Checkout →" shows
  *"Online checkout is being set up. For now, email me@joephijwegen.com to order."* No Stripe route
  yet (books, prints, workshops). Decision: launch with the honest email-order interim (fine, low
  risk), or wire Stripe checkout + orders + stock + confirmation emails first. Always planned last.

### Fix before launch
- **Empty alt text on every photo** — ✅ **done** (Aug 2026): all **777** non-hidden project image
  assets now carry a descriptive `altText`, written by viewing each photo. Stored on the image asset,
  so it applies everywhere the photo appears and survives Best/home re-picks. Refine wording anytime
  in Studio (image asset → Alt text). Archived projects' images were skipped (unlisted).
- **Four unused fonts** — ✅ **done** (`d2a1975`): only `GeistPixelSquare` is used; dropped
  Grid/Circle/Triangle/Line — four fewer webfont downloads per page.
- **Dead `/articles` route + schema** — ✅ **done** (`d2a1975`): removed route, schema, Studio
  entries, and the agent-markdown reference (0 docs, unlinked).

### Verify on the deployment (not local dev)
- **Titles show stale "kaijo" in local dev.** Dev-CDN staleness only — live Sanity data is clean
  ("Joep Hijwegen", no duplication). Confirm every `<title>` ends "— Joep Hijwegen" on the deploy.
- **Real-phone `/work`.** The desktop one-screen lock is gated on `hover: hover`; the in-app browser
  reports hover even at phone width, so it couldn't be fully verified here. On a real phone
  (`hover: none`) it falls back to normal vertical flow — verify on an actual device.

### Minor
- Build logs one non-blocking "Big Shoulders" font-fallback warning (wordmark). Cosmetic.

### Verified good
- Production build clean (61 static pages); TypeScript + Biome green.
- No console errors on home / store / workshops / project; all assets 200.
- Image lightbox: opens as a dialog, opposite-theme backdrop, scroll-locked, doesn't trip the theme
  toggle.
- `robots.txt` correct; `sitemap.xml` includes all projects; archived projects excluded; unknown
  URLs 404.
- Mobile project pages: single-column collage, no horizontal overflow.
- Old-Squarespace redirects mapped in the CMS, applied at build.

---

## 2. Walking it as a visitor

- **The one-screen lock is striking but unconventional.** Home and `/work` hold a single viewport and
  turn vertical scroll into the horizontal reel/filmstrip. Distinctive, but a first-timer's instinct
  is to scroll *down*, and nothing signals the wheel drives the images sideways. Consider a small
  fading "scroll →" hint on first load.
- **The footer is hidden on the locked pages.** Contact form / newsletter / email aren't reachable on
  home or `/work` except via the nav. Consider keeping a contact path always one obvious click away.
- **What's working — keep it.** Images-first project pages are beautiful; the seamless zoom lightbox
  is a highlight; the `/work` name-index → hover-highlight is lovely; the store's email-order notice
  is honest. Cohesive and fast.
- **Small things to try.** Make sure the homepage scramble-in intro resolves fast enough that the
  first thing seen isn't garbled. "Info" is a slightly generic nav label for about/contact ("About"
  reads warmer). A one-line lead-time/shipping note in the store would pre-empt the obvious question.

---

## 3. Finalize before go-live

### Content (Joep · Studio)
- [ ] Finish the commission **Best-16** selects.
- [ ] Add real images to the two new collection pages — **Behind the Scenes** and **Events** (both use
      the placeholder thumbnail now).
- [x] Fill `altText` on images — done for all 777 non-hidden project images (auto-written, refine in Studio if wanted).
- [ ] Curate homepage "Show on home" picks across projects.
- [ ] Proofread the new collection blurbs + all commission descriptions.
- [ ] Decide the store model: email-order interim vs. finish Stripe checkout.

### Code (Dev)
- [x] Remove the 4 unused GeistPixel fonts.
- [x] Remove the dead `/articles` route + schema.
- [ ] Optional: add a "scroll →" hint on the locked home/work; keep a contact path visible there.

### Exhibition: "Wonders of Reflection" (On Now) — Nov 2026
- [x] Page is **public** now: `noindex`/`nofollow` dropped, real meta description added, added to
      `sitemap.xml` (it's a hard-coded route, so it's listed manually in `app/sitemap.ts`).
- [x] **"On Now" nav flag** (brand red `#b23a30`) in the primary header, desktop + mobile; on hover it
      expands to reveal "Wonders of Reflection" and links to `/wonders-of-reflection`. Because the header
      paints through `mix-blend-mode: difference`, a per-theme `--on-now` token is pre-inverted so it
      renders as true red on every solid theme.
- [x] **`/wor` short link** added to the CMS redirects → `/wonders-of-reflection?utm_source=qr&utm_medium=print&utm_campaign=luminair`
      (302, so it can be repointed later). This is the **QR code target**.
- [ ] **QR code** encodes `https://joephijwegen.com/wor`. Save the print file (links in the step-by-step
      guide). Only works once (a) the domain is live on Vercel and (b) a Redeploy has baked in the `/wor`
      redirect. Umami attributes scans via the `utm_*` tags.
- [ ] Confirm the exhibition **date** copy ("From 3 November 2026" on the page) matches the real opening
      (press release says the cocktail menu is live Wed 4 Nov — pick one).

### Config & environment (Vercel)
- [ ] `NEXT_PUBLIC_URL=https://joephijwegen.com` in the **Production** env.
- [ ] `RESEND_API_KEY` set in prod — contact / print / workshop enquiry emails depend on it.
- [ ] Basic-Auth / password protection **OFF** for public launch.
- [ ] Redirects published in CMS, then **Redeploy** (build-time) — spot-check each old URL 301s.
- [ ] Preview deploys send `X-Robots-Tag: noindex`; the prod domain does not.

### Verify on the deployment
- [ ] Titles end "— Joep Hijwegen", none say "kaijo"; canonical = `https://joephijwegen.com/…`.
- [ ] OG image + description look right when a link is pasted into WhatsApp / LinkedIn.
- [ ] Favicon shows in both light and dark browser chrome.
- [ ] `/work` + homepage on a real phone; project pages on a real phone.

---

## 4. Going live: Squarespace → Vercel

You keep the same domain (joephijwegen.com) and only change the platform. That's the SEO-friendly
case — no "domain change" to recover from. The work is: complete redirects, switch DNS cleanly, and
**don't break your email**.

> ⚠️ **The one that bites people.** Your email `me@joephijwegen.com` almost certainly runs on DNS
> records managed at Squarespace (MX + SPF/DKIM/DMARC TXT). If you repoint DNS to Vercel and drop
> those records, **email stops**. Screenshot every current DNS record first and carry the mail
> records across unchanged.

1. **Prep (the week before).** Finish content + set the production env. **Inventory old URLs:** export
   the Pages report from Google Search Console + the Squarespace sitemap, and map every ranking/linked
   path to its new home as a 301 in the CMS redirects — **especially the workshop URLs**, since those
   rank well. **Lower DNS TTL** on current records to 300s a day or two ahead. Record all current DNS
   (A, CNAME, **MX**, TXT, subdomains).

2. **Add the domain in Vercel.** Project → Settings → Domains → add `joephijwegen.com` + `www`. Pick
   one canonical (apex or www), redirect the other. Vercel shows the exact records — typically an A
   record for the apex (`76.76.21.21`) and a CNAME for www (`cname.vercel-dns.com`). Use whatever
   Vercel displays.

3. **Switch DNS — the low-risk way.** Leave the domain *registered* at Squarespace and just repoint its
   DNS records to Vercel: replace the site's A/CNAME with Vercel's, and **keep the MX + email TXT
   records exactly as they are**. If Squarespace locks custom records, the fallback is moving
   nameservers — but then you must recreate the mail records at the new host. **Don't** attempt a
   registrar *transfer* on cutover day (takes days, needs unlock + auth code); do that later, separately.

4. **Wait for SSL, then it's live.** Once DNS resolves to Vercel it auto-issues a certificate. When the
   domain reads "Valid Configuration" with a cert, you're live. Low TTL = minutes, not hours.

5. **Verify immediately after cutover.** HTTPS loads; www ↔ apex redirect works; `curl -I` a handful of
   **old Squarespace URLs** → confirm `301` to the right new paths (workshops especially); **send +
   receive a test email**; prod pages are not noindex (a `*.vercel.app` preview still is).

6. **Search Console & SEO.** Add/verify the **domain property** (DNS TXT); submit
   `https://joephijwegen.com/sitemap.xml`. No "Change of Address" needed (same domain). **Protect the
   workshops ranking:** keep those pages' headings, keywords and depth at least as strong as the
   Squarespace version. Watch GSC **Page Indexing** for 4–8 weeks and add a redirect for every old URL
   that 404s. Keep the 301s permanently (a year minimum).

7. **Don't tear down too early.** Leave Squarespace hosting up until DNS has fully propagated and you've
   verified for a few days. Keep the domain registration active and auto-renewing. Confirm analytics
   (Umami) counts the live hostnames — tracking is restricted to the prod apex + www, so they must match.

> Two rules to tape to the monitor: **redirects are build-time** (redeploy after editing), and **every
> DNS change risks email** (treat MX/TXT as sacred).
