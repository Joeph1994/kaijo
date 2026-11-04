"use client";

import * as React from "react";
import { LightboxImage } from "~/components/lightbox";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";

export type SeriesImage = {
  image: ImageFragmentResult | null;
  aspectRatio: number | null;
};

/** Tile height (vh) the side-scroll is constrained to — mirrored in the `.project-series` CSS. */
const TILE_VH = 56;

/**
 * The rest of a project's images (everything not flagged "Best") shown as a horizontal, natively
 * scrolling strip at the foot of the page. Tiles are height-constrained and carry each image's own
 * aspect ratio, so the `sizes` hint is height × ratio (sharp on landscape, no waste on portrait).
 */
export function ProjectSeriesGallery({ images }: { images: SeriesImage[] }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const items = images.filter((i) => i.image?._id);

  // Desktop: turn a vertical wheel into horizontal scroll while the strip still has room, then hand
  // back to the page at either end so the reader keeps moving down to "More projects". Native
  // (passive:false) listener so we can preventDefault. Mobile keeps the native touch swipe.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const max = track.scrollWidth - track.clientWidth;
      if (!delta || max <= 0) {
        return;
      }
      const atStart = track.scrollLeft <= 0;
      const atEnd = track.scrollLeft >= max - 1;
      if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) {
        event.preventDefault();
        track.scrollLeft += delta;
      }
    };
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => track.removeEventListener("wheel", onWheel);
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="project-series" aria-label="Full series">
      <h2 className="section-eyebrow project-series_head">Full series</h2>
      <div ref={trackRef} className="project-series_track">
        {items.map((item) => {
          const ratio = item.aspectRatio ?? 1;
          return (
            <div key={item.image?._id} className="project-series_tile" style={{ aspectRatio: `${ratio}` }}>
              <LightboxImage
                image={item.image}
                className="project-series_image"
                sizes={`(max-width: 767px) 80vw, ${Math.round(TILE_VH * ratio)}vh`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
