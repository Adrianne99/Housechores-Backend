// ───────────────────────────────────────────────────────────────
// Give every branch-inventory row a realistic RANDOM quantity so
// stock levels vary naturally (no longer mostly 1). The total
// inventory value is whatever the random stock sums to — no cap.
//
// Run from the backend/ directory:
//   node scripts/randomize_stock.js
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import "../models/branches_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const valueOf = (rows) =>
  rows.reduce((s, r) => s + (r.pricing?.selling_price ?? 0) * (r.stock?.current_stock ?? 0), 0);

const run = async () => {
  await connectDb();
  console.log("Connected.\n");

  const rows = await branch_inventory_model.find({}).populate("branch", "name");
  console.log(`Inventory rows: ${rows.length}`);
  console.log(`Current total inventory value: ₱${valueOf(rows).toLocaleString()}\n`);

  // Random quantity per row. A weighted spread so it's not uniform-looking:
  // most items sit in a healthy mid-range, a few run low, a few overstock.
  const rollStock = () => {
    const r = Math.random();
    if (r < 0.15) return randInt(3, 20); // low stock
    if (r < 0.85) return randInt(20, 120); // normal
    return randInt(120, 300); // overstocked
  };

  const ops = rows.map((r) => {
    const stock = rollStock();
    // Keep reorder_level sensible relative to the new stock.
    const reorder = Math.min(r.stock?.reorder_level ?? 10, Math.max(3, Math.floor(stock * 0.25)));
    return {
      updateOne: {
        filter: { _id: r._id },
        update: {
          $set: { "stock.current_stock": stock, "stock.reorder_level": reorder },
        },
      },
    };
  });
  await branch_inventory_model.bulkWrite(ops);

  // Verify + report.
  const after = await branch_inventory_model.find({}).populate("branch", "name");
  console.log(`New total inventory value: ₱${valueOf(after).toLocaleString()}`);

  const perBranch = {};
  const buckets = { "1": 0, "2-10": 0, "11-50": 0, "51-150": 0, "151+": 0 };
  for (const r of after) {
    const name = r.branch?.name ?? "(no branch)";
    const q = r.stock?.current_stock ?? 0;
    perBranch[name] ??= { value: 0, units: 0, rows: 0 };
    perBranch[name].value += (r.pricing?.selling_price ?? 0) * q;
    perBranch[name].units += q;
    perBranch[name].rows += 1;
    if (q === 1) buckets["1"]++;
    else if (q <= 10) buckets["2-10"]++;
    else if (q <= 50) buckets["11-50"]++;
    else if (q <= 150) buckets["51-150"]++;
    else buckets["151+"]++;
  }

  console.log("\nPer-branch breakdown:");
  for (const [name, b] of Object.entries(perBranch)) {
    console.log(
      `  ${name}: ₱${b.value.toLocaleString()} value | ${b.units.toLocaleString()} units | ${b.rows} rows`,
    );
  }
  console.log("\nQuantity distribution (rows per stock range):");
  for (const [range, n] of Object.entries(buckets)) console.log(`  ${range.padEnd(8)} ${n}`);

  console.log("\n✅ Done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Randomize failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
