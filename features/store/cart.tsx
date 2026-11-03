"use client";

import { useHotkeys } from "@mantine/hooks";
import * as React from "react";
import { useCart } from "./cart-context";

export function Cart() {
  const { items, count, subtotal, open, setOpen, remove, setQty } = useCart();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useHotkeys([["Escape", () => setOpen(false)]]);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Only id + qty + (for services) price are sent; the server re-prices books and prints.
        body: JSON.stringify({ items: items.map((i) => ({ id: i.id, qty: i.qty, price: i.price, title: i.title })) }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout. Please email me@joephijwegen.com to order.");
      setLoading(false);
    }
  }

  return (
    <>
      {count > 0 && (
        <button
          type="button"
          className="cart-fab"
          onClick={() => setOpen(true)}
          aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
        >
          Cart
          <span className="cart-fab_count">{count}</span>
        </button>
      )}

      {open && (
        <div className="cart-overlay">
          <button type="button" className="cart-overlay_backdrop" aria-label="Close cart" onClick={() => setOpen(false)} />
          <aside className="cart-panel" role="dialog" aria-label="Cart" aria-modal="true">
            <div className="cart-panel_head">
              <span className="cart-panel_title">Cart</span>
              <button type="button" className="cart-panel_close" aria-label="Close cart" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className="cart-panel_empty">Your cart is empty.</p>
            ) : (
              <>
                <ul className="cart-items">
                  {items.map((item) => (
                    <li key={item.id} className="cart-item">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt="" className="cart-item_cover" />
                      ) : (
                        <span className="cart-item_cover cart-item_cover--none" aria-hidden="true" />
                      )}
                      <div className="cart-item_info">
                        <span className="cart-item_title">{item.title}</span>
                        <span className="cart-item_variant">{item.variantName}</span>
                        <div className="cart-item_qty">
                          <button type="button" aria-label="Decrease quantity" onClick={() => setQty(item.id, item.qty - 1)}>
                            −
                          </button>
                          <span>{item.qty}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => setQty(item.id, item.qty + 1)}>
                            +
                          </button>
                        </div>
                      </div>
                      <div className="cart-item_side">
                        <span className="cart-item_price">€{item.price * item.qty}</span>
                        <button type="button" className="cart-item_remove" onClick={() => remove(item.id)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="cart-panel_foot">
                  <div className="cart-panel_subtotal">
                    <span>Subtotal</span>
                    <span>€{subtotal}</span>
                  </div>
                  <button type="button" className="cart-panel_checkout" onClick={checkout} disabled={loading}>
                    {loading ? "Redirecting…" : "Checkout →"}
                  </button>
                  {error && <p className="cart-panel_notice">{error}</p>}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
