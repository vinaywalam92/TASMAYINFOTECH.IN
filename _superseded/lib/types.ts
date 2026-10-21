import type { IconKey } from "@/lib/constants";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brandName: string | null;
  categoryName: string;
  iconKey: IconKey;
  imageUrl: string | null;
  imageAlt: string | null;
  /** price in the store's display mode (incl. or excl. GST) */
  price: number;
  priceLabel: string;
  inclPrice: number;
  mrp: number | null;
  gstRate: number;
  stock: number;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
  isDemo: boolean;
};

export type CartLineData = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  brandName: string | null;
  iconKey: IconKey;
  imageUrl: string | null;
  quantity: number;
  stock: number;
  gstRate: number;
  unitInclPaise: number; // per-unit incl. GST
  lineGrossPaise: number; // after coupon share, incl. GST
  lineDiscountPaise: number;
};

export type CartSummary = {
  items: CartLineData[];
  itemCount: number;
  couponCode: string | null;
  couponError: string | null;
  deliveryPin: string | null;
  itemsGrossPaise: number;
  discountPaise: number;
  itemsAfterDiscountPaise: number;
  shippingPaise: number | null;
  shippingNote: string | null; // e.g. "Free delivery" / "Not serviceable" / "Enter PIN"
  serviceable: boolean;
  freeShippingRemainingPaise: number | null;
  gstPaise: number;
  totalPaise: number | null;
  issues: string[];
  estimate: { minDate: string; maxDate: string; ruleName: string } | null;
};

export const EMPTY_CART: CartSummary = {
  items: [],
  itemCount: 0,
  couponCode: null,
  couponError: null,
  deliveryPin: null,
  itemsGrossPaise: 0,
  discountPaise: 0,
  itemsAfterDiscountPaise: 0,
  shippingPaise: null,
  shippingNote: null,
  serviceable: true,
  freeShippingRemainingPaise: null,
  gstPaise: 0,
  totalPaise: null,
  issues: [],
  estimate: null,
};

export type CartActionResult = { ok: boolean; error?: string; cart: CartSummary };
