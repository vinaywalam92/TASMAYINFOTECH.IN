export const SITE_NAME = "TASMAY INFOTECH";
export const SITE_TAGLINE = "Technology. Reimagined.";

export const SITE_URL = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type IconKey =
  | "laptops"
  | "printers"
  | "toner"
  | "accessories"
  | "storage"
  | "networking"
  | "cctv"
  | "office";

/** Top-level categories. Used for seeding and as a fallback when the database is empty/unreachable. */
export const CORE_CATEGORIES: {
  slug: string;
  name: string;
  iconKey: IconKey;
  blurb: string;
  filterAttributes: string[];
  children: { slug: string; name: string }[];
}[] = [
  {
    slug: "laptops-computers",
    name: "Laptops & Computers",
    iconKey: "laptops",
    blurb: "Laptops, desktops, all-in-ones and workstations.",
    filterAttributes: ["Processor", "RAM", "Storage"],
    children: [
      { slug: "laptops", name: "Laptops" },
      { slug: "desktops", name: "Desktop Computers" },
      { slug: "workstations", name: "Workstations" },
      { slug: "tablets", name: "Tablets" },
    ],
  },
  {
    slug: "printers-scanners",
    name: "Printers & Scanners",
    iconKey: "printers",
    blurb: "Inkjet, laser and multifunction printers, plus scanners.",
    filterAttributes: ["Type", "Print Technology"],
    children: [
      { slug: "inkjet-printers", name: "Inkjet Printers" },
      { slug: "laser-printers", name: "Laser Printers" },
      { slug: "scanners", name: "Scanners" },
    ],
  },
  {
    slug: "toner-ink-cartridges",
    name: "Toner & Ink Cartridges",
    iconKey: "toner",
    blurb: "Original toner cartridges and ink for popular printers.",
    filterAttributes: ["Type", "Colour"],
    children: [
      { slug: "toner-cartridges", name: "Toner Cartridges" },
      { slug: "ink-cartridges", name: "Ink Cartridges & Bottles" },
    ],
  },
  {
    slug: "computer-accessories",
    name: "Computer Accessories",
    iconKey: "accessories",
    blurb: "Keyboards, mice, webcams, headsets and more.",
    filterAttributes: ["Connectivity"],
    children: [
      { slug: "keyboards", name: "Keyboards" },
      { slug: "mice", name: "Mice" },
      { slug: "webcams", name: "Webcams" },
      { slug: "headsets", name: "Headsets" },
    ],
  },
  {
    slug: "storage-memory",
    name: "Storage & Memory",
    iconKey: "storage",
    blurb: "SSDs, hard disks, pen drives, memory cards and RAM.",
    filterAttributes: ["Capacity", "Interface"],
    children: [
      { slug: "ssd", name: "SSDs" },
      { slug: "hard-disks", name: "Hard Disks" },
      { slug: "pen-drives", name: "Pen Drives" },
      { slug: "memory-cards", name: "Memory Cards" },
    ],
  },
  {
    slug: "networking-equipment",
    name: "Networking Equipment",
    iconKey: "networking",
    blurb: "Routers, switches, access points and cables.",
    filterAttributes: ["Speed", "Ports"],
    children: [
      { slug: "routers", name: "Routers" },
      { slug: "switches", name: "Switches" },
      { slug: "network-cables", name: "Cables & Connectors" },
    ],
  },
  {
    slug: "cctv-surveillance-accessories",
    name: "CCTV & Surveillance Accessories",
    iconKey: "cctv",
    blurb: "Surveillance-grade storage and compatible IT equipment.",
    filterAttributes: ["Capacity"],
    children: [
      { slug: "surveillance-storage", name: "Surveillance Storage" },
      { slug: "cctv-accessories", name: "Compatible Accessories" },
    ],
  },
  {
    slug: "office-supplies",
    name: "Office Supplies",
    iconKey: "office",
    blurb: "Stationery, paper and consumables for the workplace.",
    filterAttributes: [],
    children: [
      { slug: "paper", name: "Paper & Labels" },
      { slug: "stationery", name: "Stationery" },
    ],
  },
];

/** GST state codes (used to decide CGST+SGST vs IGST on invoices). Names match validators.INDIAN_STATES loosely. */
export const GST_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

/** Forward fulfilment steps shown on the tracking timeline (PAID is labelled "Payment confirmed"). */
export const ORDER_FLOW = [
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Store" },
  { href: "/categories", label: "Categories", mega: true },
  { href: "/brands", label: "Brands" },
  { href: "/business-solutions", label: "Business Solutions" },
  { href: "/track-order", label: "Track Order" },
  { href: "/contact", label: "Contact Us" },
] as const;

export const SESSION_COOKIE = "tm_session";
export const CART_COOKIE = "tm_cart";
export const MAX_CART_QTY = 20;
