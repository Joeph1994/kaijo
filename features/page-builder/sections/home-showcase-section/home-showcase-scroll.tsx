"use client";

import * as React from "react";
import { Link } from "~/components/link";
import { KaijoImage } from "~/features/kaijo/kaijo-image";
import type { ImageFragmentResult } from "~/features/sanity/media/fragment";

export type HomeShowcaseSlide = {
  key: string;
  image: ImageFragmentResult | null;
  aspectRatio: number | null;
  project: string;
  type: string | null;
  year: string | null;
  slug: string;
};

type Tile = {
  key: string;
  slide: HomeShowcaseSlide;
  h: number; // height as a fraction of the reel band (H_TIERS)
  vy: number; // vertical position within the band, -1 (top) .. 0 (centered) .. 1 (bottom)
};

type Batch = { id: number; tiles: Tile[] };

/** One reshuffle happens per batch, so a batch is the "every 36 images" unit on desktop. */
const BATCH = 36;
const MAX_BATCHES = 6; // bound the DOM on an endless scroll (~216 tiles)
const EDGE_PX = 1600; // grow the strip this far before reaching either end

// `--h` is a UNITLESS FRACTION of the reel track height (CSS multiplies it: desktop `* 100%`, mobile
// `* --reel-h`). Max stays 1 (fill), with a spread down to ~half so the strip never reads as a grid.
// Unitless (not `%`) so mobile can size tiles in real viewport units — iOS Safari doesn't resolve a
// percentage height against a flex-stretched parent, which made mobile tiles collapse and overlap.
const H_TIERS = [0.5, 0.64, 0.78, 0.9, 1];

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** Heights for a batch: two tiles of the exact same size are never placed next to each other. */
function pickHeights(count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let h = pick(H_TIERS);
    if (i >= 1 && h === out[i - 1]) {
      h = pick(H_TIERS.filter((v) => v !== out[i - 1]));
    }
    out.push(h);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Deterministic first batch for SSR / first paint (no Math.random → no hydration mismatch). */
function seedBatch(pool: HomeShowcaseSlide[], count: number): Batch {
  const tiles = pool.slice(0, count).map((slide, i) => ({
    key: `seed:${slide.key}:${i}`,
    slide,
    h: 0.92,
    vy: 0,
  }));
  return { id: 0, tiles };
}

// Module-level so batch ids stay unique even across a Strict Mode dev remount (which resets refs);
// a per-instance ref could mint the same id twice and collide React keys.
let batchSeq = 0;

/** A reshuffled batch: new random selection (subset of the pool), order and per-tile sizes. */
function randomBatch(pool: HomeShowcaseSlide[], count: number): Batch {
  batchSeq += 1;
  const id = batchSeq;
  const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));
  const heights = pickHeights(chosen.length);
  const tiles = chosen.map((slide, i) => ({
    key: `${id}:${slide.key}:${i}`,
    slide,
    h: heights[i] as number,
    // Randomly nudge shorter tiles up or down within the band (taller tiles have little room to move).
    vy: Math.random() * 2 - 1,
  }));
  return { id, tiles };
}

export function HomeShowcaseScroll({ slides }: { slides: HomeShowcaseSlide[] }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const batchEls = React.useRef(new Map<number, HTMLDivElement>());
  const pendingPrune = React.useRef(0);
  const pendingPrependId = React.useRef<number | null>(null);
  const rafPending = React.useRef(false);
  const didInitScroll = React.useRef(false);

  const [batches, setBatches] = React.useState<Batch[]>(() => [seedBatch(slides, Math.min(BATCH, slides.length))]);
  // Mirror of `batches` so append/prune can compute the next array without a functional updater
  // (updaters are double-invoked under Strict Mode, which would double our id/scroll side effects).
  const batchesRef = React.useRef(batches);
  const commitBatches = React.useCallback((next: Batch[]) => {
    batchesRef.current = next;
    setBatches(next);
  }, []);

  const [canHover, setCanHover] = React.useState(true);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  // On mount: detect pointer type, then reshuffle. Both desktop and touch get the endless horizontal
  // reel (3-batch runway); only the input method (drag/wheel vs native touch swipe) and the caption
  // reveal (hover vs tap) differ by `canHover`.
  React.useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover)").matches);
    commitBatches([randomBatch(slides, BATCH), randomBatch(slides, BATCH), randomBatch(slides, BATCH)]);
  }, [slides, commitBatches]);

  // Mark the route so the layout can lock the homepage to one screen on desktop (CSS in global.css).
  // Set at first paint by the bootstrap script too; this keeps it correct across client navigation.
  React.useEffect(() => {
    document.documentElement.classList.add("home-route");
    return () => document.documentElement.classList.remove("home-route");
  }, []);

  // Desktop one-screen: the page doesn't scroll vertically, so route the wheel, trackpad and arrow
  // keys into the reel's horizontal scroll (which feeds the endless-batch logic via onScroll).
  React.useEffect(() => {
    const track = trackRef.current;
    if (!canHover || !track) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) {
        return;
      }
      event.preventDefault();
      track.scrollLeft += delta;
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const page = track.clientWidth * 0.9;
      const map: Record<string, number> = {
        ArrowRight: 240,
        ArrowDown: 240,
        ArrowLeft: -240,
        ArrowUp: -240,
        PageDown: page,
        PageUp: -page,
      };
      const delta = map[event.key];
      if (delta === undefined) {
        return;
      }
      event.preventDefault();
      track.scrollLeft += delta;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [canHover]);

  const drag = React.useRef({ active: false, moved: false, startX: 0, startLeft: 0 });

  // Reaching the right end: add a batch on the right, prune the (off-screen) leftmost.
  const appendBatch = React.useCallback(() => {
    const track = trackRef.current;
    let next = [...batchesRef.current, randomBatch(slides, BATCH)];
    // Prune from the front to bound the DOM, but never mid-drag (it would jump the grab).
    if (next.length > MAX_BATCHES && track && !drag.current.active) {
      const removed = next[0] as Batch;
      const el = batchEls.current.get(removed.id);
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      pendingPrune.current += (el?.offsetWidth ?? 0) + gap;
      next = next.slice(1);
    }
    commitBatches(next);
  }, [slides, commitBatches]);

  // Reaching the left end: add a batch on the left (compensated so nothing jumps), prune the right.
  const prependBatch = React.useCallback(() => {
    const batch = randomBatch(slides, BATCH);
    let next = [batch, ...batchesRef.current];
    if (next.length > MAX_BATCHES && !drag.current.active) {
      next = next.slice(0, MAX_BATCHES); // drop from the (off-screen) right
    }
    pendingPrependId.current = batch.id;
    commitBatches(next);
  }, [slides, commitBatches]);

  // Keep the viewport visually stable when the strip grows: a right-append that pruned the left
  // pulls scrollLeft back; a left-prepend pushes it forward by the newly added batch's width.
  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    if (pendingPrune.current) {
      track.scrollLeft -= pendingPrune.current;
      pendingPrune.current = 0;
    }
    if (pendingPrependId.current != null) {
      const el = batchEls.current.get(pendingPrependId.current);
      if (el) {
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        track.scrollLeft += el.offsetWidth + gap;
      }
      pendingPrependId.current = null;
    }
  }, [batches]);

  // Start one full batch in (runway for the endless left-scroll) with the first visible image half
  // off the left edge, so it's obvious the strip scrolls both ways (desktop and touch alike).
  useIsoLayoutEffect(() => {
    if (didInitScroll.current) {
      return;
    }
    const track = trackRef.current;
    const wraps = track?.querySelectorAll<HTMLElement>(".home-showcase_batch");
    if (track && wraps && wraps.length >= 2) {
      const firstVisibleTile = wraps[1]?.querySelector<HTMLElement>(".home-showcase_tile");
      if (firstVisibleTile) {
        const tileRect = firstVisibleTile.getBoundingClientRect();
        const contentX = tileRect.left - track.getBoundingClientRect().left + track.scrollLeft;
        track.scrollLeft = contentX + tileRect.width * 0.5;
        didInitScroll.current = true;
      }
    }
  }, [batches]);

  // Touch (no hover): the centred tile shows its label automatically. The active project is the tile
  // whose centre is nearest the viewport centre, updated as the reel scrolls.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || canHover) {
      return;
    }
    let raf = 0;
    const sync = () => {
      const rect = track.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let bestKey: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const el of track.querySelectorAll<HTMLElement>(".home-showcase_tile")) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - center);
        if (d < bestDist) {
          bestDist = d;
          bestKey = el.dataset.key ?? null;
        }
      }
      if (bestKey) {
        setActiveKey(bestKey);
      }
    };
    const onScrollSync = () => {
      if (raf) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };
    track.addEventListener("scroll", onScrollSync, { passive: true });
    sync();
    return () => {
      track.removeEventListener("scroll", onScrollSync);
      cancelAnimationFrame(raf);
    };
  }, [canHover, batches]);

  const onScroll = React.useCallback(() => {
    if (rafPending.current) {
      return;
    }
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const track = trackRef.current;
      if (!track) {
        return;
      }
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_PX) {
        appendBatch();
      } else if (track.scrollLeft <= EDGE_PX) {
        prependBatch();
      }
    });
  }, [appendBatch, prependBatch]);

  const onPointerDown = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track || e.pointerType === "touch") {
      return;
    }
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: track.scrollLeft };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track || !drag.current.active) {
      return;
    }
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) {
      drag.current.moved = true;
    }
    track.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = () => {
    drag.current.active = false;
  };

  // Touch tap vs swipe: a swipe that scrolled the reel must not navigate.
  const touch = React.useRef({ x: 0, y: 0, moved: false });

  const onTileClick = (e: React.MouseEvent) => {
    // A mouse drag that scrolled the track shouldn't also open a project.
    if (drag.current.moved) {
      e.preventDefault();
      drag.current.moved = false;
      return;
    }
    // Touch: only a genuine tap opens a project (single tap — the centred tile already shows its
    // label via the scroll-sync below, so there's no reveal step to consume the first tap).
    if (touch.current.moved) {
      e.preventDefault();
      touch.current.moved = false;
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: horizontal scroller of links, not a listbox.
    <div
      ref={trackRef}
      role="list"
      className="home-showcase_track"
      onScroll={onScroll}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t?.clientX ?? 0, y: t?.clientY ?? 0, moved: false };
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t && (Math.abs(t.clientX - touch.current.x) > 8 || Math.abs(t.clientY - touch.current.y) > 8)) {
          touch.current.moved = true;
        }
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      {batches.map((batch) => (
        <div
          key={batch.id}
          className="home-showcase_batch"
          ref={(el) => {
            if (el) {
              batchEls.current.set(batch.id, el);
            } else {
              batchEls.current.delete(batch.id);
            }
          }}
        >
          {batch.tiles.map((tile) => {
            const isActive = activeKey === tile.key;
            return (
              <Link
                key={tile.key}
                href={`/project/${tile.slide.slug}`}
                role="listitem"
                className="home-showcase_tile"
                data-active={isActive ? "true" : undefined}
                data-key={tile.key}
                style={
                  {
                    "--h": `${tile.h}`,
                    "--vy": `${tile.vy}`,
                    "--ratio": tile.slide.aspectRatio ?? 1,
                  } as React.CSSProperties
                }
                onClick={onTileClick}
              >
                <div className="home-showcase_media">
                  {/* Tile height = `--h` (fraction) × the reel track (86vh desktop, 64dvh mobile); the
                      rendered width is that height × the image's aspect ratio, hinted precisely below. */}
                  <KaijoImage
                    image={tile.slide.image}
                    className="home-showcase_image"
                    sizes={`(max-width: 767px) ${Math.round(64 * tile.h * (tile.slide.aspectRatio ?? 1))}vh, ${Math.round(86 * tile.h * (tile.slide.aspectRatio ?? 1))}vh`}
                  />
                </div>
                <div className="home-showcase_caption">
                  <span className="home-showcase_meta">
                    <span className="home-showcase_project">{tile.slide.project}</span>
                    {tile.slide.type && <span className="home-showcase_type">{tile.slide.type}</span>}
                    {tile.slide.year && <span className="home-showcase_year">{tile.slide.year}</span>}
                  </span>
                  <span className="home-showcase_go" aria-hidden="true">
                    View project →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
