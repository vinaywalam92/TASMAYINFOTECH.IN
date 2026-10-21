/** Client-safe sort labels (catalog.ts is server-only). Keys must match SORTS in catalog.ts. */
export const SORTS: Record<string, { label: string }> = {
  popular: { label: "Popularity" },
  newest: { label: "Newest" },
  "price-asc": { label: "Price: low to high" },
  "price-desc": { label: "Price: high to low" },
  name: { label: "Name A–Z" },
};
