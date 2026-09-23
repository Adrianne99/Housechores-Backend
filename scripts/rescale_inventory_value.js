// ───────────────────────────────────────────────────────────────
// Rescale current_stock across ALL branch inventory so the total
// inventory value (Σ selling_price × current_stock — the same figure
// shown on the app's "Inventory Value" card) lands at ₱90,000.
//
// Run from the backend/ directory:
//   node scripts/rescale_inventory_value.js
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import "../models/branches_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";

const TARGET = 90000;
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const valueOf = (rows) =>
  rows.reduce((s, r) => s + (r.pricing?.selling_price ?? 0) * (r.stock?.current_stock ?? 0), 0);

const run = async () => {
  await connectDb();
  console.log("Connected.\n");

  const rows = await branch_inventory_model.find({}).populate("branch", "name");
  console.log(`Inventory rows: ${rows.length}`);
  console.log(`Current total inventory value: ₱${valueOf(rows).toLocaleString()}\n`);

  // Baseline: every row carries at least 1 unit.
  const newStock = rows.map(() => 1);
  const price = rows.map((r) => r.pricing?.selling_price ?? 0);
  const baseValue = price.reduce((s, p) => s + p, 0);

  if (baseValue > TARGET) {
    // Even 1 unit each exceeds the target → scale down proportionally,
    // allowing some rows to fall to 0 stock.
    const f = TARGET / baseValue;
    for (let i = 0; i < rows.length; i++) newStock[i] = Math.max(0, Math.round(f));
    console.log(
      `Note: 1-unit baseline (₱${baseValue.toLocaleString()}) already exceeds target; scaled down.`,
    );
  } else {
    // Distribute the remaining budget as extra units onto random rows
    // (weighted only by affordability) until we can't add a cheapest unit.
    let budget = TARGET - baseValue;
    const minPrice = Math.min(...price.filter((p) => p > 0));
    let guard = 0;
    while (budget >= minPrice && guard < 5_000_000) {
      guard++;
      const i = randInt(0, rows.length - 1);
      if (price[i] > 0 && price[i] <= budget) {
        newStock[i] += 1;
        budget -= price[i];
      }
    }
  }

  // Apply.
  const ops = rows.map((r, i) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { "stock.current_stock": newStock[i] } },
    },
  }));
  await branch_inventory_model.bulkWrite(ops);

  // Verify.
  const after = await branch_inventory_model.find({}).populate("branch", "name");
  console.log(`\nNew total inventory value: ₱${valueOf(after).toLocaleString()}`);

  const perBranch = {};
  for (const r of after) {
    const name = r.branch?.name ?? "(no branch)";
    perBranch[name] ??= { value: 0, units: 0, rows: 0 };
    perBranch[name].value += (r.pricing?.selling_price ?? 0) * (r.stock?.current_stock ?? 0);
    perBranch[name].units += r.stock?.current_stock ?? 0;
    perBranch[name].rows += 1;
  }
  console.log("\nPer-branch breakdown:");
  for (const [name, b] of Object.entries(perBranch)) {
    console.log(
      `  ${name}: ₱${b.value.toLocaleString()} value | ${b.units.toLocaleString()} units | ${b.rows} rows`,
    );
  }

  console.log("\n✅ Done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Rescale failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
