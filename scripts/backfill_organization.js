// ───────────────────────────────────────────────────────────────
// One-time migration: backfill `organization` on all existing data
// so records created before multi-tenancy are attached to the right
// tenant, and drop the old GLOBAL unique indexes that tenancy replaces
// with per-organization compound indexes.
//
// Run from the backend/ directory:   node scripts/backfill_organization.js
//
// Safe to run more than once (idempotent): documents that already have
// an organization are left untouched.
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import user_model from "../models/user_model.js";
import branch_model from "../models/branches_model.js";
import product_model from "../models/product_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";
import order_model from "../models/order_model.js";
import held_order_model from "../models/held_order_model.js";
import shift_model from "../models/shift_model.js";
import timelog_model from "../models/timelog_model.js";

const as_id = (v) => (v == null ? null : String(v._id ?? v));

const run = async () => {
  await connectDb();
  console.log("Connected. Starting backfill…\n");

  // ─── 1. Drop stale GLOBAL unique indexes ──────────────────────
  // These were unique across the whole database; tenancy makes them
  // unique per-organization instead. Dropping lets syncIndexes rebuild
  // the compound versions defined in the schemas.
  const drop_index = async (model, name) => {
    try {
      await model.collection.dropIndex(name);
      console.log(`  dropped index ${model.collection.name}.${name}`);
    } catch (err) {
      if (err.codeName === "IndexNotFound" || err.code === 27) return;
      console.warn(
        `  could not drop ${model.collection.name}.${name}: ${err.message}`,
      );
    }
  };
  console.log("Dropping stale global indexes…");
  await drop_index(product_model, "barcode_1");
  await drop_index(branch_model, "code_1");
  await drop_index(order_model, "order_number_1");

  // ─── 2. Admins own themselves ─────────────────────────────────
  const users = await user_model.find({});
  const user_by_id = new Map(users.map((u) => [as_id(u._id), u]));

  const admins = users.filter((u) => u.role === "admin");
  const default_org =
    admins.length > 0 ? as_id(admins[0]._id) : as_id(users[0]?._id);

  for (const admin of admins) {
    if (!admin.organization) {
      admin.organization = admin._id;
      await admin.save();
    }
  }
  console.log(`\n${admins.length} admin(s) set as organization roots.`);

  // ─── 3. Resolve each non-admin user's org via created_by chain ─
  const resolve_user_org = (user) => {
    let cursor = user;
    for (let depth = 0; depth < 10 && cursor; depth++) {
      if (cursor.role === "admin") return as_id(cursor._id);
      if (cursor.organization) return as_id(cursor.organization);
      const creator_id = as_id(cursor.created_by);
      if (!creator_id) break;
      cursor = user_by_id.get(creator_id);
    }
    return null;
  };

  // ─── 4. Branches: org = creator's org (admin) ─────────────────
  const branches = await branch_model.find({});
  const branch_org = new Map(); // branchId -> orgId
  for (const branch of branches) {
    let org = branch.organization && as_id(branch.organization);
    if (!org) {
      const creator = user_by_id.get(as_id(branch.created_by));
      org = (creator && resolve_user_org(creator)) || default_org;
      branch.organization = org;
      await branch.save();
    }
    branch_org.set(as_id(branch._id), org);
  }
  console.log(`${branches.length} branch(es) assigned to an organization.`);

  // ─── 5. Non-admin users: created_by chain, then branch fallback ─
  let staff_count = 0;
  for (const user of users) {
    if (user.role === "admin" || user.organization) continue;
    const org =
      resolve_user_org(user) ||
      (user.branch && branch_org.get(as_id(user.branch))) ||
      default_org;
    user.organization = org;
    await user.save();
    staff_count++;
  }
  console.log(`${staff_count} staff member(s) attached to an organization.`);

  // ─── 6. Branch-derived collections ────────────────────────────
  const backfill_by_branch = async (model, label) => {
    const docs = await model.find({ organization: { $in: [null, undefined] } });
    let n = 0;
    for (const doc of docs) {
      doc.organization = branch_org.get(as_id(doc.branch)) || default_org;
      await doc.save();
      n++;
    }
    console.log(`${n} ${label} attached to an organization.`);
  };
  await backfill_by_branch(branch_inventory_model, "inventory row(s)");
  await backfill_by_branch(order_model, "order(s)");
  await backfill_by_branch(held_order_model, "held order(s)");
  await backfill_by_branch(shift_model, "shift(s)");
  await backfill_by_branch(timelog_model, "timelog(s)");

  // ─── 7. Products: org from any inventory row that references them ─
  const inventories = await branch_inventory_model.find({});
  const product_org = new Map();
  for (const inv of inventories) {
    const pid = as_id(inv.product);
    if (pid && !product_org.has(pid))
      product_org.set(pid, as_id(inv.organization));
  }
  const products = await product_model.find({});
  let product_count = 0;
  for (const product of products) {
    if (product.organization) continue;
    product.organization = product_org.get(as_id(product._id)) || default_org;
    await product.save();
    product_count++;
  }
  console.log(`${product_count} product(s) attached to an organization.`);

  // ─── 8. Rebuild indexes from the updated schemas ──────────────
  console.log("\nRebuilding compound indexes…");
  for (const model of [
    user_model,
    branch_model,
    product_model,
    branch_inventory_model,
    order_model,
    held_order_model,
    shift_model,
    timelog_model,
  ]) {
    await model.syncIndexes();
    console.log(`  synced indexes for ${model.collection.name}`);
  }

  console.log("\n✅ Backfill complete.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
