// ───────────────────────────────────────────────────────────────
// Seed random Philippine grocery products into every branch.
//
//   • ~100–150 distinct products per branch, each with its own barcode
//   • sum of selling prices per branch lands within ₱20,000–₱30,000
//   • realistic PH brands, categories, prices, stock and suppliers
//
// Run from the backend/ directory:
//   node scripts/seed_ph_products.js
//
// Safe-ish to re-run: a branch that already carries ≥ 100 products is
// skipped so re-runs don't keep stacking inventory.
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import user_model from "../models/user_model.js";
import branch_model from "../models/branches_model.js";
import product_model from "../models/product_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";

// ─── deterministic-ish RNG helpers ────────────────────────────────
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round = (n) => Math.round(n);

const SUPPLIERS = [
  "Puregold Trading",
  "SM Markets Distribution",
  "Mega Global Corp",
  "Universal Robina Corp",
  "Monde Nissin Phils",
  "San Miguel Foods",
  "Nestlé Philippines",
  "Unilever PH",
  "Liwayway Marketing",
  "Local Wet Market Supplier",
];

// ─── Base catalog: realistic PH grocery items ─────────────────────
// price = a typical single selling price in pesos (relative weight;
// the whole branch basket is scaled afterwards to hit ₱20–30k).
const BASE = [
  // Noodles & instant
  { name: "Pancit Canton Original", brand: "Lucky Me!", category: "Noodles", unit: "pack", price: 16 },
  { name: "Pancit Canton Chilimansi", brand: "Lucky Me!", category: "Noodles", unit: "pack", price: 16 },
  { name: "Instant Mami Beef", brand: "Lucky Me!", category: "Noodles", unit: "pack", price: 14 },
  { name: "Payless Xtra Big Sweet & Spicy", brand: "Payless", category: "Noodles", unit: "pack", price: 22 },
  { name: "Cup Noodles Seafood", brand: "Nissin", category: "Noodles", unit: "cup", price: 35 },
  { name: "Spaghetti Pasta 1kg", brand: "Royal", category: "Pasta", unit: "pack", price: 95 },

  // Canned goods
  { name: "Corned Beef 150g", brand: "Argentina", category: "Canned Goods", unit: "can", price: 38 },
  { name: "Beef Loaf 150g", brand: "Argentina", category: "Canned Goods", unit: "can", price: 32 },
  { name: "Meat Loaf 150g", brand: "555", category: "Canned Goods", unit: "can", price: 30 },
  { name: "Sardines in Tomato Sauce 155g", brand: "555", category: "Canned Goods", unit: "can", price: 21 },
  { name: "Sardines Spicy 155g", brand: "Mega", category: "Canned Goods", unit: "can", price: 23 },
  { name: "Tuna Flakes in Oil 180g", brand: "Century Tuna", category: "Canned Goods", unit: "can", price: 45 },
  { name: "Tuna Hot & Spicy 180g", brand: "Century Tuna", category: "Canned Goods", unit: "can", price: 47 },
  { name: "Luncheon Meat 350g", brand: "Maling", category: "Canned Goods", unit: "can", price: 95 },
  { name: "Vienna Sausage 130g", brand: "Purefoods", category: "Canned Goods", unit: "can", price: 36 },
  { name: "Pork & Beans 230g", brand: "Del Monte", category: "Canned Goods", unit: "can", price: 28 },
  { name: "Fruit Cocktail 432g", brand: "Del Monte", category: "Canned Goods", unit: "can", price: 78 },

  // Condiments & sauces
  { name: "Soy Sauce 385ml", brand: "Silver Swan", category: "Condiments", unit: "bottle", price: 28 },
  { name: "Vinegar 385ml", brand: "Datu Puti", category: "Condiments", unit: "bottle", price: 22 },
  { name: "Fish Sauce Patis 385ml", brand: "Rufina", category: "Condiments", unit: "bottle", price: 30 },
  { name: "Banana Ketchup 320g", brand: "UFC", category: "Condiments", unit: "bottle", price: 35 },
  { name: "Tomato Ketchup 320g", brand: "Del Monte", category: "Condiments", unit: "bottle", price: 38 },
  { name: "Oyster Sauce 405g", brand: "Mama Sita's", category: "Condiments", unit: "bottle", price: 55 },
  { name: "Spaghetti Sauce Sweet 1kg", brand: "Del Monte", category: "Condiments", unit: "pack", price: 110 },
  { name: "Cooking Oil 1L", brand: "Golden Fiesta", category: "Cooking Essentials", unit: "bottle", price: 120 },
  { name: "Palm Oil 1L", brand: "Minola", category: "Cooking Essentials", unit: "bottle", price: 105 },
  { name: "Iodized Salt 1kg", brand: "Fidel", category: "Cooking Essentials", unit: "pack", price: 18 },
  { name: "White Sugar 1kg", brand: "Victorias", category: "Cooking Essentials", unit: "pack", price: 72 },

  // Beverages
  { name: "3-in-1 Coffee Original", brand: "Nescafé", category: "Beverages", unit: "sachet", price: 8 },
  { name: "Brown Coffee 3-in-1", brand: "Kopiko", category: "Beverages", unit: "sachet", price: 8 },
  { name: "Coffee Twin Pack", brand: "Great Taste", category: "Beverages", unit: "sachet", price: 9 },
  { name: "Powdered Juice Orange 25g", brand: "Tang", category: "Beverages", unit: "sachet", price: 12 },
  { name: "Coke Sakto 295ml", brand: "Coca-Cola", category: "Beverages", unit: "bottle", price: 20 },
  { name: "Royal Tru-Orange 1.5L", brand: "Royal", category: "Beverages", unit: "bottle", price: 65 },
  { name: "Sprite 1.5L", brand: "Sprite", category: "Beverages", unit: "bottle", price: 65 },
  { name: "C2 Apple 500ml", brand: "C2", category: "Beverages", unit: "bottle", price: 28 },
  { name: "Bottled Water 500ml", brand: "Wilkins", category: "Beverages", unit: "bottle", price: 15 },
  { name: "Distilled Water 1L", brand: "Absolute", category: "Beverages", unit: "bottle", price: 25 },
  { name: "Energy Drink 240ml", brand: "Cobra", category: "Beverages", unit: "bottle", price: 22 },

  // Dairy & breakfast
  { name: "Evaporated Milk 370ml", brand: "Alaska", category: "Dairy", unit: "can", price: 38 },
  { name: "Condensed Milk 300ml", brand: "Alaska", category: "Dairy", unit: "can", price: 42 },
  { name: "Powdered Milk 320g", brand: "Bear Brand", category: "Dairy", unit: "pack", price: 145 },
  { name: "Coffee Creamer 250g", brand: "Coffee-Mate", category: "Dairy", unit: "pack", price: 88 },
  { name: "Cheese Singles 200g", brand: "Eden", category: "Dairy", unit: "pack", price: 78 },
  { name: "Filled Cheese 165g", brand: "Magnolia", category: "Dairy", unit: "pack", price: 62 },
  { name: "Butter 200g", brand: "Star", category: "Dairy", unit: "pack", price: 85 },
  { name: "Margarine 250g", brand: "Dari Crème", category: "Dairy", unit: "pack", price: 55 },

  // Snacks & biscuits
  { name: "Crackers Sky Flakes", brand: "M.Y. San", category: "Snacks", unit: "pack", price: 30 },
  { name: "Crackers Fita 25s", brand: "M.Y. San", category: "Snacks", unit: "pack", price: 40 },
  { name: "Hansel Sandwich", brand: "Rebisco", category: "Snacks", unit: "pack", price: 35 },
  { name: "Cream-O Vanilla", brand: "Rebisco", category: "Snacks", unit: "pack", price: 28 },
  { name: "Piattos Cheese", brand: "Jack 'n Jill", category: "Snacks", unit: "pack", price: 30 },
  { name: "Nova Multigrain", brand: "Jack 'n Jill", category: "Snacks", unit: "pack", price: 30 },
  { name: "Chippy BBQ", brand: "Jack 'n Jill", category: "Snacks", unit: "pack", price: 22 },
  { name: "Cornick Garlic", brand: "Boy Bawang", category: "Snacks", unit: "pack", price: 18 },
  { name: "Prawn Crackers", brand: "Oishi", category: "Snacks", unit: "pack", price: 22 },
  { name: "Marty's Cracklin'", brand: "Oishi", category: "Snacks", unit: "pack", price: 15 },
  { name: "Potato Chips 60g", brand: "Lay's", category: "Snacks", unit: "pack", price: 45 },
  { name: "Choco Pie 6s", brand: "Orion", category: "Snacks", unit: "box", price: 65 },

  // Rice & grains
  { name: "Well-Milled Rice 5kg", brand: "Sinandomeng", category: "Rice & Grains", unit: "sack", price: 285 },
  { name: "Premium Rice 5kg", brand: "Jasmine", category: "Rice & Grains", unit: "sack", price: 320 },
  { name: "Brown Rice 1kg", brand: "Doña Maria", category: "Rice & Grains", unit: "pack", price: 78 },

  // Personal care
  { name: "Bath Soap 90g", brand: "Safeguard", category: "Personal Care", unit: "bar", price: 35 },
  { name: "Beauty Soap 115g", brand: "Palmolive", category: "Personal Care", unit: "bar", price: 32 },
  { name: "Shampoo Sachet", brand: "Sunsilk", category: "Personal Care", unit: "sachet", price: 7 },
  { name: "Shampoo 170ml", brand: "Head & Shoulders", category: "Personal Care", unit: "bottle", price: 115 },
  { name: "Toothpaste 150g", brand: "Colgate", category: "Personal Care", unit: "tube", price: 78 },
  { name: "Toothbrush", brand: "Colgate", category: "Personal Care", unit: "piece", price: 45 },
  { name: "Deodorant Roll-on 40ml", brand: "Rexona", category: "Personal Care", unit: "piece", price: 95 },
  { name: "Sanitary Napkin 8s", brand: "Modess", category: "Personal Care", unit: "pack", price: 48 },
  { name: "Tissue 2-ply", brand: "Femme", category: "Personal Care", unit: "roll", price: 18 },

  // Household
  { name: "Powder Detergent 1kg", brand: "Tide", category: "Household", unit: "pack", price: 145 },
  { name: "Detergent Bar 380g", brand: "Surf", category: "Household", unit: "bar", price: 28 },
  { name: "Fabric Conditioner 800ml", brand: "Downy", category: "Household", unit: "pack", price: 105 },
  { name: "Dishwashing Liquid 250ml", brand: "Joy", category: "Household", unit: "bottle", price: 48 },
  { name: "Bleach 1L", brand: "Zonrox", category: "Household", unit: "bottle", price: 42 },
  { name: "Toilet Cleaner 500ml", brand: "Domex", category: "Household", unit: "bottle", price: 75 },
  { name: "Dishwashing Paste 200g", brand: "Axion", category: "Household", unit: "tub", price: 32 },
  { name: "Insect Spray 500ml", brand: "Baygon", category: "Household", unit: "can", price: 165 },
  { name: "Candle 6s", brand: "Generic", category: "Household", unit: "pack", price: 25 },
  { name: "Matches 10s", brand: "Generic", category: "Household", unit: "pack", price: 12 },

  // Frozen & meat
  { name: "Hotdog Jumbo 1kg", brand: "Purefoods", category: "Frozen & Meat", unit: "pack", price: 210 },
  { name: "Tocino 250g", brand: "Pampanga's Best", category: "Frozen & Meat", unit: "pack", price: 95 },
  { name: "Longganisa 250g", brand: "Purefoods", category: "Frozen & Meat", unit: "pack", price: 88 },
  { name: "Chicken Nuggets 200g", brand: "CDO", category: "Frozen & Meat", unit: "pack", price: 78 },

  // Baking & misc
  { name: "All-Purpose Flour 1kg", brand: "Maya", category: "Baking", unit: "pack", price: 62 },
  { name: "Hotcake Mix 200g", brand: "Maya", category: "Baking", unit: "pack", price: 32 },
  { name: "Eggs (tray of 12)", brand: "Farm Fresh", category: "Fresh", unit: "tray", price: 95 },
  { name: "Loaf Bread", brand: "Gardenia", category: "Bakery", unit: "pack", price: 60 },
  { name: "Pandesal 10s", brand: "Local Bakery", category: "Bakery", unit: "pack", price: 35 },
];

// Expand the base catalog with size/pack variants so each branch can
// draw a unique random subset of up to ~150 items.
const SIZE_VARIANTS = [
  { suffix: "", factor: 1.0 },
  { suffix: " (Family Pack)", factor: 1.85 },
  { suffix: " (Twin Pack)", factor: 1.95 },
  { suffix: " (Mini)", factor: 0.6 },
];

const CATALOG = [];
for (const item of BASE) {
  for (const v of SIZE_VARIANTS) {
    CATALOG.push({
      name: item.name + v.suffix,
      brand: item.brand,
      category: item.category,
      unit: item.unit,
      price: Math.max(5, round(item.price * v.factor)),
    });
  }
}

// ─── barcode generation (PH GS1 prefix 480) ───────────────────────
const usedBarcodes = new Set();
const makeBarcode = () => {
  let code;
  do {
    let body = "";
    for (let i = 0; i < 10; i++) body += randInt(0, 9);
    code = "480" + body; // 13 digits
  } while (usedBarcodes.has(code));
  usedBarcodes.add(code);
  return code;
};

// Fisher–Yates shuffle, returns first n items.
const sample = (arr, n) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const run = async () => {
  await connectDb();
  console.log("Connected. Seeding Philippine grocery products…\n");

  // Default org = first admin (used for branches with no organization).
  const firstAdmin = await user_model.findOne({ role: "admin" }).sort({ createdAt: 1 });
  const defaultOrg = firstAdmin?.organization || firstAdmin?._id;
  if (!defaultOrg) throw new Error("No admin user found to use as default organization.");

  const branches = await branch_model.find({});
  console.log(`Found ${branches.length} branch(es).\n`);

  for (const branch of branches) {
    // Resolve the org for this branch's products/inventory. We do NOT
    // mutate the branch document itself: forcing branch.organization on
    // the undefined-org branches would collide with the unique
    // (organization, code:null) index. Products/inventory just inherit
    // the default org so the super-admin tenant can see them.
    const org = branch.organization || defaultOrg;
    if (!branch.organization) {
      console.log(`• ${branch.name}: no organization on branch → products use default org ${org}`);
    }

    // Skip already-seeded branches.
    const existingCount = await branch_inventory_model.countDocuments({ branch: branch._id });
    if (existingCount >= 100) {
      console.log(`• ${branch.name}: already has ${existingCount} products — skipped.\n`);
      continue;
    }

    // Pre-load this org's existing barcodes so we never collide.
    const existing = await product_model.find({ organization: org }).select("barcode");
    for (const p of existing) usedBarcodes.add(p.barcode);

    const N = randInt(100, 150);
    const target = randInt(20000, 30000); // ₱ sum of selling prices
    const chosen = sample(CATALOG, N);

    // Scale raw prices so the selling-price sum hits the target.
    const rawSum = chosen.reduce((s, c) => s + c.price, 0);
    const scale = target / rawSum;

    const productDocs = [];
    const meta = []; // parallel array: pricing + stock per chosen item
    for (const c of chosen) {
      const selling = Math.max(5, round(c.price * scale));
      const costRatio = 0.6 + Math.random() * 0.25; // 60–85% of selling
      const cost = Math.max(1, round(selling * costRatio));
      const markup = selling - cost; // peso markup (selling = cost + markup)

      productDocs.push({
        barcode: makeBarcode(),
        name: c.name,
        brand: c.brand,
        category: c.category,
        unit: c.unit,
        photo: "",
        organization: org,
      });
      meta.push({
        selling,
        cost,
        markup,
        current_stock: randInt(8, 250),
        reorder_level: randInt(5, 40),
        supplier: pick(SUPPLIERS),
      });
    }

    // Insert products, then inventory rows referencing them.
    const insertedProducts = await product_model.insertMany(productDocs, { ordered: true });

    const inventoryDocs = insertedProducts.map((p, i) => ({
      product: p._id,
      branch: branch._id,
      organization: org,
      stock: {
        current_stock: meta[i].current_stock,
        reorder_level: meta[i].reorder_level,
        supplier: meta[i].supplier,
      },
      pricing: {
        cost_per_unit: meta[i].cost,
        markup_value: meta[i].markup,
        selling_price: meta[i].selling,
      },
    }));
    await branch_inventory_model.insertMany(inventoryDocs, { ordered: true });

    const sellSum = meta.reduce((s, m) => s + m.selling, 0);
    console.log(
      `• ${branch.name}: +${insertedProducts.length} products | ` +
        `selling-price sum ₱${sellSum.toLocaleString()} (target ₱${target.toLocaleString()})\n`,
    );
  }

  console.log("✅ Seeding complete.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Seeding failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
