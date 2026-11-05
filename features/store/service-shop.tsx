"use client";

import * as React from "react";
import { useCart } from "./cart-context";
import { CUSTOM_SERVICE_ID, serviceId, serviceSlug } from "./services";

export type ServiceShopItem = { name: string; price: number; note?: string | null; group?: string | null };

/** Add a set-price service/workshop to the same cart as books — `kind: "workshop"` (no cover). */
function useAddService() {
  const { add } = useCart();
  return (item: ServiceShopItem) =>
    add({
      id: serviceId(item.name),
      kind: "workshop",
      bookId: serviceId(item.name),
      slug: serviceSlug(item.name),
      title: item.name,
      variantName: item.note || "Workshop & services",
      price: item.price,
    });
}

/**
 * The buyable UI on the hidden service-shop page: set-price workshops/services plus an optional
 * custom-amount card (the buyer types an agreed price). Everything flows into the same cart as books
 * and through the same checkout; the server re-prices each line from Sanity. `layout` picks a single
 * dropdown menu (the default, for a hidden post-enquiry shop) or a grid of cards.
 */
export function ServiceShop({
  items,
  layout,
  customEnabled,
  customLabel,
  customNote,
}: {
  items: ServiceShopItem[];
  layout?: "grid" | "dropdown" | null;
  customEnabled?: boolean;
  customLabel?: string | null;
  customNote?: string | null;
}) {
  const custom = customEnabled ? <CustomAmount label={customLabel} note={customNote} /> : null;

  if (layout === "grid") {
    return (
      <div className="service-shop">
        <ServiceGrid items={items} />
        {custom}
      </div>
    );
  }

  return (
    <div className="service-picker">
      <ServiceDropdown items={items} />
      {custom}
    </div>
  );
}

/** Grid of cards — one "Add to cart" button per option. */
function ServiceGrid({ items }: { items: ServiceShopItem[] }) {
  const addService = useAddService();

  return (
    <>
      {items.map((item) => (
        <div key={serviceSlug(item.name)} className="service-shop_item">
          <div className="service-shop_item-head">
            <span className="service-shop_item-name">{item.name}</span>
            <span className="service-shop_item-price">€{item.price}</span>
          </div>
          {item.note && <p className="service-shop_item-note">{item.note}</p>}
          <button type="button" className="service-shop_add" onClick={() => addService(item)}>
            Add to cart
          </button>
        </div>
      ))}
    </>
  );
}

/** One menu to choose an option (grouped by `group`), then add the chosen one to the cart. */
function ServiceDropdown({ items }: { items: ServiceShopItem[] }) {
  const addService = useAddService();
  const [selected, setSelected] = React.useState("");

  const chosen = items.find((item) => serviceSlug(item.name) === selected) ?? null;

  // Preserve CMS order while splitting ungrouped options from named groups.
  const ungrouped = items.filter((item) => !item.group);
  const groupNames: string[] = [];
  for (const item of items) {
    if (item.group && !groupNames.includes(item.group)) {
      groupNames.push(item.group);
    }
  }

  const option = (item: ServiceShopItem) => (
    <option key={serviceSlug(item.name)} value={serviceSlug(item.name)}>
      {item.name} — €{item.price}
    </option>
  );

  return (
    <>
      <label className="service-picker_field">
        <span className="service-picker_label">Choose a workshop or service</span>
        <select className="service-picker_select" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Select an option…</option>
          {ungrouped.map(option)}
          {groupNames.map((name) => (
            <optgroup key={name} label={name}>
              {items.filter((item) => item.group === name).map(option)}
            </optgroup>
          ))}
        </select>
      </label>
      {chosen?.note && <p className="service-picker_note">{chosen.note}</p>}
      <button
        type="button"
        className="service-picker_add"
        disabled={!chosen}
        onClick={() => {
          if (!chosen) {
            return;
          }
          addService(chosen);
          setSelected("");
        }}
      >
        {chosen ? `Add to cart — €${chosen.price}` : "Add to cart"}
      </button>
    </>
  );
}

/** A card where the buyer enters an agreed amount — for tailored or one-off services. */
function CustomAmount({ label, note }: { label?: string | null; note?: string | null }) {
  const { add } = useCart();
  const [amount, setAmount] = React.useState("");

  const customAmount = Number.parseInt(amount, 10);
  const customValid = Number.isFinite(customAmount) && customAmount > 0;
  const heading = label || "Custom / other service";

  return (
    <div className="service-shop_item service-shop_item--custom">
      <div className="service-shop_item-head">
        <span className="service-shop_item-name">{heading}</span>
      </div>
      {note && <p className="service-shop_item-note">{note}</p>}
      <div className="service-shop_custom-row">
        <span className="service-shop_custom-euro" aria-hidden="true">
          €
        </span>
        <input
          type="number"
          min="1"
          inputMode="numeric"
          className="service-shop_custom-input"
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Custom amount in euros"
        />
      </div>
      <button
        type="button"
        className="service-shop_add"
        disabled={!customValid}
        onClick={() => {
          if (!customValid) {
            return;
          }
          add({
            id: `${CUSTOM_SERVICE_ID}:${customAmount}`,
            kind: "workshop",
            bookId: CUSTOM_SERVICE_ID,
            slug: "custom",
            title: heading,
            variantName: `Custom · €${customAmount}`,
            price: customAmount,
          });
          setAmount("");
        }}
      >
        Add to cart
      </button>
    </div>
  );
}
