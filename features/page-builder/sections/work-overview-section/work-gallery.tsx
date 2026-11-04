"use client";

import * as React from "react";
import { Link } from "~/components/link";
import { KaijoImage } from "~/features/kaijo/kaijo-image";
import { usePrefersReducedMotion } from "~/features/motion/use-prefers-reduced-motion";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";

export type WorkGalleryItem = {
  key: string;
  image: ImageFragmentResult | null;
  aspectRatio: number | null;
  project: string;
  type: string | null;
  year: string | null;
  slug: string;
};

// Smaller + tighter than the home wall: a narrow set of heights, centred, no vertical drift.
const H_TIERS = [46, 52, 58];

function heightsFor(n: number, random: boolean): number[] {
  if (!random) {
    return Array.from({ length: n }, () => 52); // deterministic for SSR / first paint
  }
  return Array.from({ length: n }, () => H_TIERS[Math.floor(Math.random() * H_TIERS.length)] as number);
}

/**
 * A finite, side-scrolling wall of one image per project, paired with a left-hand index of names.
 * Hovering a name or an image highlights that image (brighter) and dims the rest; hovering an image
 * also reveals its caption (like the home scroll).
 */
export function WorkGallery({ items }: { items: WorkGalleryItem[] }) {
  const wallRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ active: false, moved: false, startX: 0, startLeft: 0 });
  const [heights, setHeights] = React.useState<number[]>(() => heightsFor(items.length, false));
  const [active, setActive] = React.useState<string | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  // Touch has no hover: an index name's first tap focuses its image, a second tap navigates.
  const [canHover, setCanHover] = React.useState(true);
  const tapArmed = React.useRef<string | null>(null);

  React.useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  // Subtle per-load height variance, applied after mount so SSR and first render match.
  React.useEffect(() => {
    setHeights(heightsFor(items.length, true));
  }, [items.length]);

  // Mouse-wheel support: turn a vertical wheel into horizontal scroll while the pointer is over the
  // wall, and hand off to the page at either end so the reader keeps moving down the page. Native
  // (passive:false) listener so we can preventDefault.
  React.useEffect(() => {
    const wall = wallRef.current;
    if (!wall) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const max = wall.scrollWidth - wall.clientWidth;
      if (!delta || max <= 0) {
        return;
      }
      const atStart = wall.scrollLeft <= 0;
      const atEnd = wall.scrollLeft >= max - 1;
      // Only hijack while there's room to move that way; at the edge, let the page scroll take over.
      if ((delta > 0 && !atEnd) || (delta < 0 && !atStart)) {
        event.preventDefault();
        wall.scrollLeft += delta;
      }
    };
    wall.addEventListener("wheel", onWheel, { passive: false });
    return () => wall.removeEventListener("wheel", onWheel);
  }, []);

  // Touch (no hover): sync the highlighted name to the scroll position instead of to the finger.
  // The active project is the leftmost tile that is still at least half visible, so the highlight
  // switches exactly as a picture passes the halfway point. Desktop keeps the hover highlight.
  React.useEffect(() => {
    const wall = wallRef.current;
    if (!wall || canHover) {
      return;
    }
    const sync = () => {
      const wallRect = wall.getBoundingClientRect();
      const tiles = Array.from(wall.children) as HTMLElement[];
      let idx = 0;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        if (!tile) {
          continue;
        }
        const r = tile.getBoundingClientRect();
        const left = r.left - wallRect.left;
        const visible = Math.min(left + r.width, wallRect.width) - Math.max(left, 0);
        if (r.width > 0 && visible / r.width >= 0.5) {
          idx = i;
          break;
        }
      }
      setActive(items[idx]?.key ?? null);
    };
    let raf = 0;
    const onScroll = () => {
      if (raf) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };
    wall.addEventListener("scroll", onScroll, { passive: true });
    sync();
    return () => {
      wall.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [canHover, items]);

  // Bring a tile into view within the wall (used when hovering the left-hand index) so the
  // highlighted image is always visible. Scrolls only the horizontal wall, never the page.
  const scrollToTile = (index: number) => {
    const wall = wallRef.current;
    const tile = wall?.children[index] as HTMLElement | undefined;
    if (!wall || !tile) {
      return;
    }
    const wallRect = wall.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const delta = tileRect.left - wallRect.left - (wall.clientWidth - tile.clientWidth) / 2;
    wall.scrollTo({ left: wall.scrollLeft + delta, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const wall = wallRef.current;
    if (!wall || e.pointerType === "touch") {
      return;
    }
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: wall.scrollLeft };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const wall = wallRef.current;
    if (!wall || !drag.current.active) {
      return;
    }
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) {
      drag.current.moved = true;
    }
    wall.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  const onTileClick = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  // Touch two-tap on an index name: first tap highlights + scrolls the image into view, second tap
  // on the same name navigates. Desktop (hover) navigates on the first click as usual.
  const onNameClick = (e: React.MouseEvent, key: string, index: number) => {
    if (canHover) {
      return;
    }
    if (tapArmed.current !== key) {
      e.preventDefault();
      tapArmed.current = key;
      setActive(key);
      scrollToTile(index);
    }
  };

  return (
    <div
      className="work-gallery"
      data-has-active={active ? "true" : undefined}
      onPointerLeave={() => {
        if (canHover) {
          setActive(null);
        }
      }}
    >
      <nav className="work-gallery_index" aria-label="Projects">
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={`/project/${item.slug}`}
            className="work-gallery_name"
            data-active={active === item.key ? "true" : undefined}
            onPointerEnter={() => {
              if (canHover) {
                setActive(item.key);
                scrollToTile(index);
              }
            }}
            onFocus={() => {
              setActive(item.key);
              scrollToTile(index);
            }}
            onBlur={() => {
              if (canHover) {
                setActive(null);
              }
            }}
            onClick={(e) => onNameClick(e, item.key, index)}
          >
            {item.project}
          </Link>
        ))}
      </nav>
      <div
        ref={wallRef}
        className="work-gallery_wall"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {items.map((item, index) => (
          <Link
            key={item.key}
            href={`/project/${item.slug}`}
            className="work-gallery_tile"
            data-active={active === item.key ? "true" : undefined}
            style={{ "--h": `${heights[index]}vh`, "--ratio": item.aspectRatio ?? 1 } as React.CSSProperties}
            onPointerEnter={() => {
              if (canHover) {
                setActive(item.key);
              }
            }}
            onFocus={() => setActive(item.key)}
            onBlur={() => {
              if (canHover) {
                setActive(null);
              }
            }}
            onClick={onTileClick}
          >
            <div className="work-gallery_media">
              {/* Tiles are height-constrained (`--h`vh) with the image's own aspect ratio, so the
                  rendered WIDTH is height × ratio — hint that exactly rather than a flat vh. */}
              <KaijoImage
                image={item.image}
                className="work-gallery_image"
                sizes={`(max-width: 767px) 70vw, ${Math.round((heights[index] ?? 52) * (item.aspectRatio ?? 1))}vh`}
              />
            </div>
            <div className="work-gallery_caption">
              <span className="work-gallery_meta">
                <span className="work-gallery_project">{item.project}</span>
                {item.type && <span className="work-gallery_type">{item.type}</span>}
                {item.year && <span className="work-gallery_year">{item.year}</span>}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
