"use client";

import * as React from "react";
import { useCart } from "./cart-context";

/** Shown after a completed Stripe Checkout. Empties the cart and confirms the order. */
export function CheckoutSuccess() {
  const { clear } = useCart();

  React.useEffect(() => {
    clear();
  }, [clear]);

  return (
    <section className="checkout-done">
      <h1 className="checkout-done_title">Thank you — your order is confirmed.</h1>
      <p className="checkout-done_text">
        A confirmation email with your receipt is on its way. I'll be in touch about shipping. If anything's unclear, email{" "}
        <a href="mailto:me@joephijwegen.com">me@joephijwegen.com</a>.
      </p>
      <a className="checkout-done_link" href="/">
        Back to the site →
      </a>
    </section>
  );
}
