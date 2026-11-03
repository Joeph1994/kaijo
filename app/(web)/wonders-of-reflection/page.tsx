import type { Metadata } from "next";
import { defineQuery } from "next-sanity";
import { sanityFetch } from "~/features/sanity/client";
import { seo } from "~/features/site/seo/utils";
import { SiteShell } from "~/features/site/site-shell";
import { ExhibitionWorks } from "./exhibition-works";
import { EDITION } from "./works";

export async function generateMetadata(): Promise<Metadata> {
  return await seo({
    title: "Wonders of Reflection",
    description:
      "Wonders of Reflection — eight of Joep Hijwegen's reflection photographs around a central mirror at LuminAir, Amsterdam, each paired with a cocktail. Prints available.",
  });
}

const StockQ = defineQuery(`*[_id == "storeStock"][0]{ "items": items[]{ sku, stock } }`);

export default async function WondersOfReflectionPage() {
  const stock = await sanityFetch<{ items: Array<{ sku: string | null; stock: number | null }> | null } | null>({
    query: StockQ,
    options: { next: { revalidate: 30 } },
  });
  const soldOut = (stock?.items ?? [])
    .filter((i) => i.sku && typeof i.stock === "number" && i.stock <= 0)
    .map((i) => i.sku as string);

  return (
    <SiteShell>
      <div className="wor">
        <header className="wor-hero">
          <div className="wor-hero_media">
            {/* biome-ignore lint/performance/noImgElement: static public image on a bespoke page. */}
            <img
              src="/wonders-of-reflection/01.jpg"
              alt="Wonders of Reflection — a building reflected in a wet Amsterdam street"
            />
          </div>
          <div className="wor-hero_text">
            <p className="wor-eyebrow">Exhibition · LuminAir, Amsterdam</p>
            <h1 className="wor-title">Wonders of Reflection</h1>
            <p className="wor-lead">
              Eight photographs exploring reflections in water, glass and metal, where familiar scenes dissolve into colour,
              pattern and abstraction. Presented around a central mirror at LuminAir, each work is paired with a cocktail that
              draws from the same visual language.
            </p>
            <p className="wor-meta">From 3 November 2026 · LuminAir, Amsterdam</p>
            <a className="wor-cta" href="#prints">
              Buy a print →
            </a>
          </div>
        </header>

        <section className="wor-section">
          <h2 className="wor-h2">The exhibition</h2>
          <div className="wor-prose">
            <p>
              Across the globe, reflections turn landscapes, architecture and light into wonders of their own.{" "}
              <em>Wonders of Reflection</em> gathers eight of them — from the salt flats of Uyuni to the Golden Bend of the
              Herengracht — brought to life through Joep Hijwegen's lens.
            </p>
            <p>
              At LuminAir the works hang around a central mirror, each paired with a cocktail that reaches the same place by
              taste. A ninth wonder waits in the mirror itself: the one reflection not caught by the lens — your own.
            </p>
          </div>
        </section>

        <section className="wor-section" id="prints">
          <h2 className="wor-h2">Buy a print</h2>
          <p className="wor-prose wor-prose--narrow">
            The eight works are available as smaller, unframed editions, offering an accessible way to own a work from the
            exhibition. Each print features a 16.7 × 25 cm image on 20 × 30 cm archival paper with white borders, in an edition of{" "}
            {EDITION}, and includes a copy of my photobook <a href="/books/controlled-coincidence">Controlled Coincidence</a>.
          </p>
          <ExhibitionWorks soldOut={soldOut} />
          <p className="wor-aside">
            These works are part of Joep Hijwegen's wider practice in print. For a larger, framed fine-art print of one of them,{" "}
            <a href="mailto:me@joephijwegen.com?subject=Fine-art%20print%20enquiry">enquire for pricing</a> — or{" "}
            <a href="/store#prints">view the fine-art editions →</a>
          </p>
        </section>

        <section className="wor-section">
          <h2 className="wor-h2">More from Joep</h2>
          <p className="wor-prose wor-prose--narrow">
            Amsterdam-based photographer working across personal projects, editorial commissions and brand collaborations.
          </p>
          <nav className="wor-links">
            <a href="/work">Selected work →</a>
            <a href="/workshops">Workshops →</a>
            <a href="/store">Books &amp; prints →</a>
            <a href="/info">About →</a>
            <a href="https://www.instagram.com/joephijwegen" target="_blank" rel="noreferrer noopener">
              Instagram ↗
            </a>
          </nav>
        </section>

        <footer className="wor-foot">
          <span>Wonders of Reflection — Joep Hijwegen × LuminAir, Amsterdam.</span>
          <a href="https://www.luminairamsterdam.com" target="_blank" rel="noreferrer noopener">
            luminairamsterdam.com ↗
          </a>
        </footer>
      </div>
    </SiteShell>
  );
}
