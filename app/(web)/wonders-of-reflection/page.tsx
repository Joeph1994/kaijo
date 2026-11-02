import type { Metadata } from "next";
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

export default function WondersOfReflectionPage() {
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
            The eight works are also available as smaller, unframed editions, offering a more accessible way to own a work from
            the exhibition. Each print features a 16.7 × 25 cm image on 20 × 30 cm archival rag baryta paper with white borders,
            in an edition of {EDITION}, and includes a copy of my photobook{" "}
            <a href="/books/controlled-coincidence">Controlled Coincidence</a>.
          </p>
          <ExhibitionWorks />
          <p className="wor-aside">
            Part of Joep Hijwegen's wider work in print. <a href="/store#prints">View the fine-art editions →</a>
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
