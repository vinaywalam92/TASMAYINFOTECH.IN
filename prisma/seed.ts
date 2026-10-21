/**
 * Seed script (npm run db:seed).
 *
 *  - Always: category tree (from src/lib/constants.ts).
 *  - If SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set: creates/updates that ADMIN user.
 *  - If SEED_DEMO_DATA="true": adds DEMO brands, products, reviews and a demo shipping rule.
 *    Every demo row has isDemo=true, so it is hidden when NODE_ENV=production (unless SHOW_DEMO_DATA=true).
 *    Demo names are deliberately generic ("Sample Brand", "Demo …"): no real brands, prices or reviews.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CORE_CATEGORIES } from "../src/lib/constants";

const db = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 90);

async function seedCategories() {
  let order = 0;
  for (const c of CORE_CATEGORIES) {
    const parent = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.blurb, iconKey: c.iconKey, sortOrder: order, isActive: true },
      create: { slug: c.slug, name: c.name, description: c.blurb, iconKey: c.iconKey, sortOrder: order },
    });
    let childOrder = 0;
    for (const ch of c.children) {
      await db.category.upsert({
        where: { slug: ch.slug },
        update: { name: ch.name, parentId: parent.id, iconKey: c.iconKey, sortOrder: childOrder },
        create: { slug: ch.slug, name: ch.name, parentId: parent.id, iconKey: c.iconKey, sortOrder: childOrder },
      });
      childOrder++;
    }
    order++;
  }
  console.log(`✓ categories (${CORE_CATEGORIES.length} top-level)`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("• admin user skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)");
    return;
  }
  if (password.length < 10 || password.length > 72) throw new Error("SEED_ADMIN_PASSWORD must be 10–72 characters");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash, isActive: true },
    create: { email, name: "Administrator", passwordHash, role: "ADMIN" },
  });
  console.log(`✓ admin user ${email} (change the password after first sign-in)`);
}

type Demo = {
  cat: string; brand: number; name: string; model: string; rupees: number; gst?: number; stock: number; specs: string; featured?: boolean; sold?: number;
};

const DEMO_BRANDS = ["Sample Brand A", "Sample Brand B", "Sample Brand C"];

const DEMO_PRODUCTS: Demo[] = [
  { cat: "laptops", brand: 0, name: "Demo 15.6\" Business Laptop", model: "DEMO-L15", rupees: 45000, stock: 12, featured: true, sold: 40, specs: "Processor: Octa-core\nRAM: 16 GB\nStorage: 512 GB SSD\nDisplay: 15.6\" FHD" },
  { cat: "laptops", brand: 1, name: "Demo 14\" Ultra-light Laptop", model: "DEMO-L14", rupees: 62000, stock: 5, featured: true, sold: 25, specs: "Processor: Octa-core\nRAM: 16 GB\nStorage: 1 TB SSD\nDisplay: 14\" QHD" },
  { cat: "desktops", brand: 2, name: "Demo Office Desktop", model: "DEMO-D1", rupees: 32000, stock: 8, sold: 18, specs: "Processor: Quad-core\nRAM: 8 GB\nStorage: 256 GB SSD" },
  { cat: "inkjet-printers", brand: 0, name: "Demo Ink Tank Printer", model: "DEMO-P1", rupees: 14500, stock: 15, featured: true, sold: 33, specs: "Type: Multifunction\nPrint Technology: Ink tank\nConnectivity: Wi-Fi, USB" },
  { cat: "laser-printers", brand: 1, name: "Demo Mono Laser Printer", model: "DEMO-P2", rupees: 11800, stock: 0, sold: 12, specs: "Type: Single function\nPrint Technology: Laser\nConnectivity: USB" },
  { cat: "toner-cartridges", brand: 0, name: "Demo Black Toner Cartridge", model: "DEMO-T1", rupees: 3200, stock: 40, sold: 60, specs: "Type: Toner\nColour: Black\nCompatibility: Demo printers only" },
  { cat: "ink-cartridges", brand: 1, name: "Demo Colour Ink Set", model: "DEMO-I1", rupees: 1800, gst: 12, stock: 3, sold: 22, specs: "Type: Ink\nColour: Tri-colour" },
  { cat: "keyboards", brand: 2, name: "Demo Wireless Keyboard", model: "DEMO-K1", rupees: 1500, stock: 50, sold: 45, specs: "Connectivity: Wireless\nLayout: Full size" },
  { cat: "mice", brand: 2, name: "Demo Wireless Mouse", model: "DEMO-M1", rupees: 650, stock: 80, featured: true, sold: 70, specs: "Connectivity: Wireless\nDPI: 1600" },
  { cat: "webcams", brand: 1, name: "Demo 1080p Webcam", model: "DEMO-W1", rupees: 2400, stock: 20, sold: 15, specs: "Connectivity: USB\nResolution: 1080p" },
  { cat: "headsets", brand: 0, name: "Demo USB Headset", model: "DEMO-H1", rupees: 1900, stock: 25, sold: 20, specs: "Connectivity: USB\nMicrophone: Boom" },
  { cat: "ssd", brand: 1, name: "Demo 512 GB SATA SSD", model: "DEMO-S1", rupees: 3400, stock: 60, featured: true, sold: 55, specs: "Capacity: 512 GB\nInterface: SATA III" },
  { cat: "ssd", brand: 0, name: "Demo 1 TB NVMe SSD", model: "DEMO-S2", rupees: 6900, stock: 30, sold: 38, specs: "Capacity: 1 TB\nInterface: NVMe PCIe" },
  { cat: "pen-drives", brand: 2, name: "Demo 64 GB Pen Drive", model: "DEMO-U1", rupees: 550, stock: 120, sold: 90, specs: "Capacity: 64 GB\nInterface: USB 3.0" },
  { cat: "routers", brand: 0, name: "Demo Dual-band Wi-Fi Router", model: "DEMO-R1", rupees: 2800, stock: 35, sold: 28, specs: "Speed: AC1200\nPorts: 4 LAN" },
  { cat: "switches", brand: 1, name: "Demo 8-port Gigabit Switch", model: "DEMO-N1", rupees: 1700, stock: 22, sold: 14, specs: "Speed: Gigabit\nPorts: 8" },
  { cat: "surveillance-storage", brand: 2, name: "Demo 2 TB Surveillance Hard Disk", model: "DEMO-C1", rupees: 5400, stock: 18, sold: 17, specs: "Capacity: 2 TB" },
  { cat: "paper", brand: 0, name: "Demo A4 Copier Paper (ream)", model: "DEMO-O1", rupees: 320, gst: 12, stock: 200, sold: 80, specs: "Size: A4\nGSM: 75" },
];

async function seedDemo() {
  if (process.env.NODE_ENV === "production" && process.env.SHOW_DEMO_DATA !== "true") {
    console.log("• demo data skipped in production");
    return;
  }
  const brands = [];
  for (const name of DEMO_BRANDS) {
    brands.push(
      await db.brand.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { slug: slugify(name), name, isDemo: true },
      }),
    );
  }

  for (const d of DEMO_PRODUCTS) {
    const cat = await db.category.findUnique({ where: { slug: d.cat } });
    if (!cat) continue;
    const specs: Record<string, string> = {};
    for (const line of d.specs.split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    const slug = slugify(d.name);
    const data = {
      name: d.name,
      model: d.model,
      description: "DEMONSTRATION PRODUCT. This is sample data for development and is not a real item for sale.",
      brandId: brands[d.brand].id,
      categoryId: cat.id,
      pricePaise: d.rupees * 100,
      gstRate: d.gst ?? 18,
      stock: d.stock,
      specs,
      attributes: Object.entries(specs).map(([k, v]) => `${k}: ${v}`),
      isFeatured: !!d.featured,
      soldCount: d.sold ?? 0,
      isDemo: true,
    };
    await db.product.upsert({ where: { slug }, update: data, create: { slug, sku: `DEMO-${d.model}`, ...data } });
  }

  const first = await db.product.findFirst({ where: { isDemo: true }, orderBy: { createdAt: "asc" } });
  if (first && !(await db.review.findFirst({ where: { isDemo: true } }))) {
    await db.review.create({
      data: { productId: first.id, authorName: "Demo Reviewer", rating: 5, title: "Demonstration review", body: "This is placeholder review text shown only while developing.", status: "APPROVED", isDemo: true },
    });
    await db.product.update({ where: { id: first.id }, data: { ratingAvg: 5, ratingCount: 1 } });
  }

  if (!(await db.shippingRule.findFirst({ where: { isDemo: true } }))) {
    await db.shippingRule.create({
      data: { name: "DEMO standard delivery", feePaise: 9900, freeAbovePaise: 500000, etaMinDays: 3, etaMaxDays: 7, isDemo: true, note: "Demo rule: replace in Admin → Shipping." },
    });
  }
  console.log(`✓ demo data (${DEMO_PRODUCTS.length} products, all flagged isDemo)`);
}

async function main() {
  await seedCategories();
  await seedAdmin();
  if (process.env.SEED_DEMO_DATA === "true") await seedDemo();
  else console.log("• demo data skipped (set SEED_DEMO_DATA=true to add flagged sample products)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
