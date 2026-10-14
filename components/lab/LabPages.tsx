"use client";

import { useEffect, useMemo, useState } from "react";

import {
  LAB_CURRENCY,
  LAB_LIST,
  LAB_PRODUCTS,
  PAYMENT_TYPES,
  SHIPPING_TIERS,
  labProduct,
  money,
  toItem,
  type CartLine,
  type LabProduct,
} from "@/lib/lab/catalog";
import {
  cartItems,
  cartValue,
  oncePerLoad,
  pushEcommerce,
  readCart,
  readOrder,
  repush,
  writeCart,
  writeOrder,
  type LabOrder,
} from "@/lib/lab/store";

/**
 * The lab's pages. Each fires the GA4 ecommerce events a real store would,
 * at the moment a real store would, to window.dataLayer and nowhere else.
 *
 *   /lab                view_item_list, select_item
 *   /lab/product/<slug> view_item, add_to_cart, add_to_wishlist
 *   /lab/cart           view_cart, add_to_cart / remove_from_cart on changes
 *   /lab/checkout       begin_checkout, add_shipping_info, add_payment_info
 *   /lab/thank-you      purchase (once per order; a button replays it)
 */

const price = (n: number) => `$${n.toFixed(2)}`;

/** A drawn product tile, so the lab needs no image files. */
function Tile({ product }: { product: LabProduct }) {
  return (
    <span className="lab-tile" data-tone={product.tone} aria-hidden="true">
      {product.category === "Apparel" ? "👕" : "☕"}
    </span>
  );
}

/** Go somewhere after a push, leaving GTM a moment to send it. */
function goAfterPush(href: string) {
  window.setTimeout(() => {
    window.location.href = href;
  }, 250);
}

export function LabCatalog() {
  useEffect(() => {
    if (!oncePerLoad("view_item_list")) return;
    pushEcommerce("view_item_list", {
      ...LAB_LIST,
      items: LAB_PRODUCTS.map((p, i) => toItem(p, p.variants[0], 1, i)),
    });
  }, []);

  return (
    <>
      <h1 className="lab-title">Shop</h1>
      <ul className="lab-grid">
        {LAB_PRODUCTS.map((product, index) => (
          <li key={product.slug} className="lab-card">
            <a
              href={`/lab/product/${product.slug}`}
              onClick={(event) => {
                event.preventDefault();
                pushEcommerce("select_item", {
                  ...LAB_LIST,
                  items: [toItem(product, product.variants[0], 1, index)],
                });
                goAfterPush(`/lab/product/${product.slug}`);
              }}
            >
              <Tile product={product} />
              <span className="lab-card__name">{product.name}</span>
              <span className="lab-card__price">{price(product.price)}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function LabProductPage({ slug }: { slug: string }) {
  const product = labProduct(slug)!;
  const [variant, setVariant] = useState(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!oncePerLoad(`view_item:${slug}`)) return;
    pushEcommerce("view_item", {
      currency: LAB_CURRENCY,
      value: product.price,
      items: [toItem(product, product.variants[0], 1)],
    });
  }, [product, slug]);

  const add = () => {
    const lines = readCart();
    const existing = lines.find((l) => l.slug === slug && l.variant === variant);
    if (existing) existing.quantity += quantity;
    else lines.push({ slug, variant, quantity });
    writeCart(lines);
    pushEcommerce("add_to_cart", {
      currency: LAB_CURRENCY,
      value: money(product.price * quantity),
      items: [toItem(product, variant, quantity)],
    });
    setAdded(true);
  };

  return (
    <div className="lab-product">
      <Tile product={product} />
      <div className="lab-product__info">
        <p className="lab-hint">
          <a href="/lab">Shop</a> / {product.category}
        </p>
        <h1 className="lab-title">{product.name}</h1>
        <p className="lab-product__price">{price(product.price)}</p>
        <p>{product.description}</p>

        <label className="lab-field">
          {product.category === "Apparel" ? "Size" : "Colour"}
          <select value={variant} onChange={(event) => setVariant(event.target.value)}>
            {product.variants.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="lab-field">
          Quantity
          <input
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
          />
        </label>

        <div className="lab-actions">
          <button type="button" className="lab-btn" data-primary onClick={add}>
            Add to cart
          </button>
          <button
            type="button"
            className="lab-btn"
            onClick={() =>
              pushEcommerce("add_to_wishlist", {
                currency: LAB_CURRENCY,
                value: product.price,
                items: [toItem(product, variant, 1)],
              })
            }
          >
            Add to wishlist
          </button>
        </div>
        {added ? (
          <p className="lab-hint" role="status">
            Added. <a href="/lab/cart">View cart</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LabCart() {
  const [lines, setLines] = useState<CartLine[] | null>(null);

  useEffect(() => {
    const current = readCart();
    // The cart lives in localStorage, which the server cannot read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(current);
    if (!oncePerLoad("view_cart")) return;
    pushEcommerce("view_cart", { currency: LAB_CURRENCY, value: cartValue(current), items: cartItems(current) });
  }, []);

  if (!lines) return <p className="lab-hint">Loading cart...</p>;

  /** +1, -1, or minus the whole line. The event carries just the change. */
  const change = (index: number, delta: number) => {
    const line = lines[index];
    const product = labProduct(line.slug)!;
    const quantity = Math.abs(delta);
    const kept = lines
      .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
      .filter((l) => l.quantity > 0);
    setLines(kept);
    writeCart(kept);
    pushEcommerce(delta > 0 ? "add_to_cart" : "remove_from_cart", {
      currency: LAB_CURRENCY,
      value: money(product.price * quantity),
      items: [toItem(product, line.variant, quantity)],
    });
  };

  if (!lines.length) {
    return (
      <>
        <h1 className="lab-title">Cart</h1>
        <p>Your cart is empty. <a href="/lab">Go to the shop</a>.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="lab-title">Cart</h1>
      <ul className="lab-lines">
        {lines.map((line, index) => {
          const product = labProduct(line.slug)!;
          return (
            <li key={`${line.slug}-${line.variant}`} className="lab-line">
              <Tile product={product} />
              <span className="lab-line__name">
                {product.name}
                <span className="lab-hint"> · {line.variant}</span>
              </span>
              <span className="lab-qty">
                <button type="button" aria-label={`One less ${product.name}`} onClick={() => change(index, -1)}>
                  −
                </button>
                <span>{line.quantity}</span>
                <button type="button" aria-label={`One more ${product.name}`} onClick={() => change(index, 1)}>
                  +
                </button>
              </span>
              <span className="lab-line__price">{price(product.price * line.quantity)}</span>
              <button type="button" className="lab-link" onClick={() => change(index, -line.quantity)}>
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <p className="lab-total">
        Subtotal <strong>{price(cartValue(lines))}</strong>
      </p>
      <a href="/lab/checkout" className="lab-btn" data-primary>
        Checkout
      </a>
    </>
  );
}

export function LabCheckout() {
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [tier, setTier] = useState<string>(SHIPPING_TIERS[0].id);
  const [payment, setPayment] = useState<string>(PAYMENT_TYPES[0]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  useEffect(() => {
    const current = readCart();
    // The cart lives in localStorage, which the server cannot read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(current);
    if (!current.length || !oncePerLoad("begin_checkout")) return;
    pushEcommerce("begin_checkout", { currency: LAB_CURRENCY, value: cartValue(current), items: cartItems(current) });
  }, []);

  const shipping = SHIPPING_TIERS.find((t) => t.id === tier)!;
  const subtotal = useMemo(() => (lines ? cartValue(lines) : 0), [lines]);

  if (!lines) return <p className="lab-hint">Loading checkout...</p>;
  if (!lines.length) {
    return (
      <>
        <h1 className="lab-title">Checkout</h1>
        <p>Your cart is empty. <a href="/lab">Go to the shop</a>.</p>
      </>
    );
  }

  const base = { currency: LAB_CURRENCY, value: subtotal, items: cartItems(lines) };

  const toPayment = (event: React.FormEvent) => {
    event.preventDefault();
    pushEcommerce("add_shipping_info", { ...base, shipping_tier: shipping.label });
    setStep("payment");
  };

  const placeOrder = (event: React.FormEvent) => {
    event.preventDefault();
    pushEcommerce("add_payment_info", { ...base, payment_type: payment });
    const tax = money(subtotal * 0.1);
    const order: LabOrder = {
      transaction_id: `DEMO-${Date.now()}`,
      value: money(subtotal + tax + shipping.price),
      tax,
      shipping: shipping.price,
      shipping_tier: shipping.label,
      payment_type: payment,
      items: cartItems(lines),
      email: email.trim(),
      purchaseSent: false,
    };
    writeOrder(order);
    writeCart([]);
    goAfterPush("/lab/thank-you");
  };

  return (
    <div className="lab-checkout">
      <h1 className="lab-title">Checkout</h1>
      <p className="lab-hint">Fake details are fine. No payment is taken and nothing is stored on a server.</p>

      {step === "shipping" ? (
        <form className="lab-form" onSubmit={toPayment}>
          <label className="lab-field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Test Buyer" />
          </label>
          <label className="lab-field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="buyer@example.com"
            />
          </label>
          <fieldset className="lab-field">
            <legend>Shipping</legend>
            {SHIPPING_TIERS.map((t) => (
              <label key={t.id} className="lab-radio">
                <input type="radio" name="tier" checked={tier === t.id} onChange={() => setTier(t.id)} />
                {t.label} {t.price ? price(t.price) : ""}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="lab-btn" data-primary>
            Continue to payment
          </button>
        </form>
      ) : (
        <form className="lab-form" onSubmit={placeOrder}>
          <fieldset className="lab-field">
            <legend>Payment method</legend>
            {PAYMENT_TYPES.map((p) => (
              <label key={p} className="lab-radio">
                <input type="radio" name="payment" checked={payment === p} onChange={() => setPayment(p)} />
                {p}
              </label>
            ))}
          </fieldset>
          <p className="lab-hint">There is no card form on purpose. Choosing a method is all this demo needs.</p>
          <button type="submit" className="lab-btn" data-primary>
            Place demo order
          </button>
        </form>
      )}

      <aside className="lab-summary" aria-label="Order summary">
        <p>
          Subtotal <strong>{price(subtotal)}</strong>
        </p>
        <p>
          Shipping <strong>{price(shipping.price)}</strong>
        </p>
        <p>
          Tax (10%) <strong>{price(money(subtotal * 0.1))}</strong>
        </p>
      </aside>
    </div>
  );
}

export function LabThankYou() {
  const [order, setOrder] = useState<LabOrder | null | undefined>(undefined);
  const [lastPush, setLastPush] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const current = readOrder();
    // The order lives in sessionStorage, which the server cannot read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(current);
    if (!current || current.purchaseSent || !oncePerLoad("purchase")) return;
    const payload = pushEcommerce(
      "purchase",
      {
        transaction_id: current.transaction_id,
        currency: LAB_CURRENCY,
        value: current.value,
        tax: current.tax,
        shipping: current.shipping,
        items: current.items,
      },
      current.email ? { user_data: { email_address: current.email } } : {},
    );
    setLastPush(payload);
    writeOrder({ ...current, purchaseSent: true });
  }, []);

  if (order === undefined) return <p className="lab-hint">Loading...</p>;
  if (!order) {
    return (
      <>
        <h1 className="lab-title">No order</h1>
        <p>
          There is no demo order in this tab. <a href="/lab">Go to the shop</a>.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="lab-title">Thank you</h1>
      <p>
        Demo order <code>{order.transaction_id}</code>, total {price(order.value)}. Nothing was charged.
      </p>
      <p className="lab-hint">
        purchase fired once for this order. Reloading this page does not fire it again, the way a real store
        should behave.
      </p>
      <div className="lab-actions">
        <button
          type="button"
          className="lab-btn"
          onClick={() => {
            const payload =
              lastPush ?? {
                event: "purchase",
                event_id: crypto.randomUUID(),
                ecommerce: {
                  transaction_id: order.transaction_id,
                  currency: LAB_CURRENCY,
                  value: order.value,
                  tax: order.tax,
                  shipping: order.shipping,
                  items: order.items,
                },
              };
            repush(payload);
          }}
        >
          Fire purchase again (deduplication test)
        </button>
        <a href="/lab" className="lab-btn">
          Back to shop
        </a>
      </div>
    </>
  );
}
