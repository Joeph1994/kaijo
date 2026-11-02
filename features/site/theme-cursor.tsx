"use client";

import * as React from "react";

/**
 * A camera-style focus reticle follows the pointer: four corner brackets around a soft viewfinder
 * box, drawn as one inline SVG. Painted in --page-blend with mix-blend-mode: difference, so it reads
 * as the theme's ink over the background and inverts to a photo-negative over imagery, re-theming for
 * free when the background cycles. Over a clickable control the centre dot lights up (.is-focus); the
 * brackets never move. Clicking empty space toggles white (normal) and dark; the accent colours stay
 * in the footer background switcher. White is the initial default (set by the bootstrap script in
 * shared-web-layout).
 */
const STORAGE_KEY = "kaijo-theme";

// Elements that should NOT toggle the theme when clicked (interactive controls + media/content).
const NON_EMPTY =
  "a, button, input, textarea, select, label, summary, img, video, [role='button'], [contenteditable='true'], [data-no-cycle]";

// Clickable controls the reticle locks focus on — a subset of the above, without media/content.
const INTERACTIVE = "a, button, input, textarea, select, summary, label, [role='button']";

function applyTheme(name: string) {
  const root = document.documentElement;
  if (name === "green") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", name);
  }
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Private mode / storage disabled — theming still works for the session.
  }
}

export function ThemeCursor() {
  const reticleRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const reticle = reticleRef.current;
    if (!reticle) {
      return;
    }

    const root = document.documentElement;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let raf = 0;
    let downX = 0;
    let downY = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let locked = false;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    // A genuine click on empty space (not a drag, not an interactive/content element) toggles theme.
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
        return;
      }
      const target = e.target as Element | null;
      if (target?.closest(NON_EMPTY)) {
        return;
      }
      applyTheme(root.getAttribute("data-theme") === "dark" ? "white" : "dark");
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("click", onClick);

    // Following reticle: fine-pointer devices only (touch gets the tap-to-cycle behaviour, no follower).
    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      reticle.style.opacity = "1";

      // Lock focus over clickable controls — flip the class only when the state actually changes.
      const overInteractive = Boolean((e.target as Element | null)?.closest(INTERACTIVE));
      if (overInteractive !== locked) {
        locked = overInteractive;
        reticle.classList.toggle("is-focus", locked);
      }
    };

    const tick = () => {
      x += (targetX - x) * 0.25;
      y += (targetY - y) * 0.25;
      reticle.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    if (finePointer) {
      root.classList.add("has-theme-cursor");
      window.addEventListener("mousemove", onMouseMove);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
      root.classList.remove("has-theme-cursor");
    };
  }, []);

  return (
    <div ref={reticleRef} className="theme-cursor" aria-hidden="true">
      {/* viewBox 36×28 maps 1:1 to CSS px; brackets sit at the corners, the fill washes the inside. */}
      <svg className="theme-cursor_svg" width="36" height="28" viewBox="0 0 36 28" fill="none">
        <rect className="theme-cursor_fill" x="3" y="3" width="30" height="22" rx="5" />
        <g className="theme-cursor_brackets">
          <path d="M2 11 L2 2 L11 2" />
          <path d="M25 2 L34 2 L34 11" />
          <path d="M2 17 L2 26 L11 26" />
          <path d="M34 17 L34 26 L25 26" />
        </g>
        <circle className="theme-cursor_dot" cx="18" cy="14" r="1.3" />
      </svg>
    </div>
  );
}
