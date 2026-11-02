"use client";

import * as React from "react";

/**
 * Clicking empty space toggles between the two "modes" — white (normal) and dark. The accent
 * colours (red / blue / greens) stay available from the footer background switcher. White is the
 * initial default (set by the bootstrap script in shared-web-layout).
 */
const STORAGE_KEY = "kaijo-theme";

// Elements that should NOT toggle the theme when clicked (interactive controls + media/content).
const NON_EMPTY =
  "a, button, input, textarea, select, label, summary, img, video, [role='button'], [contenteditable='true'], [data-no-cycle]";

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
  const dotRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const dot = dotRef.current;
    if (!dot) {
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

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    // A genuine click on empty space (not a drag, not an interactive/content element) cycles theme.
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
        return;
      }
      const target = e.target as Element | null;
      if (target?.closest(NON_EMPTY)) {
        return;
      }
      applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "white" : "dark");
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("click", onClick);

    // Following dot: fine-pointer devices only (touch gets the tap-to-cycle behaviour, no follower).
    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      dot.style.opacity = "1";
    };

    const tick = () => {
      x += (targetX - x) * 0.2;
      y += (targetY - y) * 0.2;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
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

  return <div ref={dotRef} className="theme-cursor" aria-hidden="true" />;
}
