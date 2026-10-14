/**
 * The tracking lab's catalogue: two made-up products, nothing for sale.
 *
 * Every field maps onto the GA4 ecommerce item shape, so what the lab pushes
 * to the dataLayer is what a real store would push.
 */
export type LabProduct = {
  slug: string;
  id: string;
  name: string;
  brand: string;
  category: string;
  variants: string[];
  price: number;
  description: string;
  /** Two colours for the drawn product tile, as CSS custom properties. */
  tone: "a" | "b";
};

export const LAB_CURRENCY = "USD";
export const LAB_LIST = { item_list_id: "demo_catalog", item_list_name: "Demo catalog" } as const;

export const LAB_PRODUCTS: LabProduct[] = [
  {
    slug: "demo-tee",
    id: "DEMO-TEE-01",
    name: "Demo Cotton T-Shirt",
    brand: "Demo Co",
    category: "Apparel",
    variants: ["S", "M", "L"],
    price: 24,
    description: "A made-up T-shirt for practising product tracking. Nothing is for sale.",
    tone: "a",
  },
  {
    slug: "demo-mug",
    id: "DEMO-MUG-01",
    name: "Demo Ceramic Mug",
    brand: "Demo Co",
    category: "Home",
    variants: ["White", "Black"],
    price: 14.5,
    description: "A made-up mug for practising add to cart and checkout. Nothing is for sale.",
    tone: "b",
  },
];

export function labProduct(slug: string): LabProduct | undefined {
  return LAB_PRODUCTS.find((product) => product.slug === slug);
}

export type CartLine = { slug: string; variant: string; quantity: number };

/** One GA4 ecommerce item. */
export function toItem(product: LabProduct, variant: string, quantity: number, index = 0) {
  return {
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    item_variant: variant,
    item_list_id: LAB_LIST.item_list_id,
    item_list_name: LAB_LIST.item_list_name,
    index,
    price: product.price,
    quantity,
  };
}

export const SHIPPING_TIERS = [
  { id: "standard", label: "Standard (free)", price: 0 },
  { id: "express", label: "Express", price: 9.99 },
] as const;

export const PAYMENT_TYPES = ["Credit card", "PayPal", "Cash on delivery"] as const;

/** Money as a number with two decimals, the way GA4 wants value. */
export const money = (n: number) => Math.round(n * 100) / 100;
