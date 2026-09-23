// ───────────────────────────────────────────────────────────────
// Attach orphaned orders/held-orders to an organization, derived from
// their branch (every branch now has an org). Without this, org-scoped
// queries — including the dashboard — can't see these legacy records.
//
// Run from the backend/ directory:
//   node scripts/fix_order_org.js
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import branch_model from "../models/branches_model.js";
import order_model from "../models/order_model.js";
import held_order_model from "../models/held_order_model.js";

const orphan = { $or: [{ organization: null }, { organization: { $exists: false } }] };

const run = async () => {
  await connectDb();
  console.log("Connected.\n");

  // Map branch -> organization.
  const branches = await branch_model.find({}).select("organization").lean();
  const branch_org = new Map(branches.map((b) => [String(b._id), b.organization]));

  const fix = async (model, label) => {
    const docs = await model.find(orphan).select("branch").lean();
    let fixed = 0;
    for (const d of docs) {
      const org = branch_org.get(String(d.branch));
      if (!org) {
        console.warn(`  ${label} ${d._id}: branch ${d.branch} has no org — skipped`);
        continue;
      }
      await model.updateOne({ _id: d._id }, { $set: { organization: org } });
      fixed++;
    }
    console.log(`${label}: ${fixed}/${docs.length} attached to an organization.`);
  };

  await fix(order_model, "orders");
  await fix(held_order_model, "held orders");

  console.log("\n✅ Done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Fix failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
