"use client";

import { useClickOutside, useDisclosure } from "@mantine/hooks";
import { usePathname } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";
import { KaijoNavLink } from "~/features/kaijo/nav-link";
import type { SiteHeaderQResult } from "~/sanity/types";

type HeaderLinks = NonNullable<NonNullable<NonNullable<SiteHeaderQResult>["header"]>["links"]>;
type HeaderItem = HeaderLinks[number];

// Current exhibition, flagged in the nav. Kept here (not CMS) because it carries bespoke styling.
const EXHIBITION_HREF = "/wonders-of-reflection";

/**
 * "On Now" flag in the primary nav, in the brand red. At rest it reads just "On Now"; on hover/focus
 * it reveals the exhibition name (the reveal grid animates from 0fr to its content width).
 */
function OnNowLink() {
  return (
    <KaijoNavLink href={EXHIBITION_HREF} className="nav_link nav_on-now w-inline-block">
      <span className="nav_link-text nav_on-now_text">
        On&nbsp;Now
        <span className="nav_on-now_reveal">
          <span className="nav_on-now_reveal-inner">: Wonders of Reflection</span>
        </span>
      </span>
    </KaijoNavLink>
  );
}

/**
 * Primary navigation. On desktop it's an inline row (flat links + hover/focus dropdowns). Below the
 * mobile breakpoint the row is hidden and a burger button opens a full-screen menu (all links, with
 * each group's children listed under it) — the desktop row simply didn't fit on a phone.
 */
export function HeaderNav({ links }: { links: HeaderLinks }) {
  const [mobileOpen, mobileMenu] = useDisclosure(false);
  const pathname = usePathname();
  const menuId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  // Close the mobile menu on navigation. Referencing `pathname` in the body keeps it a real
  // dependency (so the effect re-runs per route) and survives `biome ... --unsafe`.
  React.useEffect(() => {
    if (pathname) {
      mobileMenu.close();
    }
  }, [pathname, mobileMenu.close]);

  // Escape closes it; lock body scroll while it's open.
  React.useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        mobileMenu.close();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, mobileMenu.close]);

  return (
    <>
      <nav className="nav_link-row" aria-label="Primary">
        <OnNowLink />
        {/* Home is dropped on desktop — the wordmark already links home. The mobile menu keeps it. */}
        {links
          .filter((item) => item.link?.href !== "/")
          .map((item) =>
            item.children && item.children.length > 0 ? (
              <NavGroup key={item.key} item={item} />
            ) : item.link?.href ? (
              <KaijoNavLink key={item.key} href={item.link.href} className="nav_link w-inline-block">
                <div className="nav_link-text">{item.link.text}</div>
              </KaijoNavLink>
            ) : null
          )}
      </nav>

      <button
        type="button"
        className="nav_burger"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        aria-controls={menuId}
        data-open={mobileOpen || undefined}
        onClick={mobileMenu.toggle}
      >
        <span className="nav_burger-line" />
        <span className="nav_burger-line" />
      </button>

      {mounted &&
        createPortal(
          <div id={menuId} className="nav_mobile" data-open={mobileOpen || undefined} hidden={!mobileOpen}>
            <button type="button" className="nav_mobile-close" aria-label="Close menu" onClick={mobileMenu.close}>
              <span className="nav_burger-line" />
              <span className="nav_burger-line" />
            </button>
            <nav className="nav_mobile-list" aria-label="Primary">
              <KaijoNavLink href={EXHIBITION_HREF} className="nav_mobile-link nav_on-now-mobile" onClick={mobileMenu.close}>
                On Now: Wonders of Reflection
              </KaijoNavLink>
              {links.map((item) =>
                item.children && item.children.length > 0 ? (
                  <MobileNavGroup key={item.key} item={item} onNavigate={mobileMenu.close} />
                ) : item.link?.href ? (
                  <KaijoNavLink key={item.key} href={item.link.href} className="nav_mobile-link" onClick={mobileMenu.close}>
                    {item.link.text}
                  </KaijoNavLink>
                ) : null
              )}
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}

/** A mobile menu item with children: the label toggles its sub-links open/closed (single tap). */
function MobileNavGroup({ item, onNavigate }: { item: HeaderItem; onNavigate: () => void }) {
  const [open, { toggle }] = useDisclosure(false);

  return (
    <div className="nav_mobile-group" data-open={open || undefined}>
      <button type="button" className="nav_mobile-link nav_mobile-toggle" aria-expanded={open} onClick={toggle}>
        {item.link?.text}
        <span className="nav_mobile-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      <div className="nav_mobile-sub" hidden={!open}>
        {item.children?.map((child) =>
          child.href ? (
            <KaijoNavLink key={child.key} href={child.href} className="nav_mobile-sublink" onClick={onNavigate}>
              {child.text}
            </KaijoNavLink>
          ) : null
        )}
      </div>
    </div>
  );
}

function NavGroup({ item }: { item: HeaderItem }) {
  const [opened, { open, close, toggle }] = useDisclosure(false);
  const ref = useClickOutside<HTMLDivElement>(close);
  const pathname = usePathname();
  const menuId = React.useId();

  // Close the menu whenever the route changes (a destination link was clicked). Referencing
  // `pathname` in the body keeps it a real dependency (and survives `biome ... --unsafe`).
  React.useEffect(() => {
    if (pathname) {
      close();
    }
  }, [pathname, close]);

  const label = item.link?.text ?? "";

  return (
    // biome-ignore lint/a11y/useKeyWithMouseEvents: hover is a progressive enhancement; keyboard users get focus + the caret button.
    // biome-ignore lint/a11y/noStaticElementInteractions: the group is a non-interactive wrapper; its interactive children (link + caret button) carry the real semantics, and these handlers only enhance open/close.
    <div
      ref={ref}
      className="nav_dropdown"
      data-open={opened || undefined}
      onMouseEnter={open}
      onMouseLeave={close}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
        }
      }}
    >
      {item.link?.href ? (
        <KaijoNavLink href={item.link.href} className="nav_link nav_dropdown-label w-inline-block">
          <div className="nav_link-text">{label}</div>
        </KaijoNavLink>
      ) : (
        <span className="nav_link nav_dropdown-label">
          <div className="nav_link-text">{label}</div>
        </span>
      )}
      <button
        type="button"
        className="nav_dropdown-toggle"
        aria-haspopup="true"
        aria-expanded={opened}
        aria-controls={menuId}
        aria-label={`${label} submenu`}
        onClick={toggle}
      >
        <span aria-hidden="true">▾</span>
      </button>
      <div id={menuId} className="nav_dropdown-menu" hidden={!opened}>
        {item.children?.map((child) =>
          child.href ? (
            <KaijoNavLink key={child.key} href={child.href} className="nav_dropdown-link">
              {child.text}
            </KaijoNavLink>
          ) : null
        )}
      </div>
    </div>
  );
}
