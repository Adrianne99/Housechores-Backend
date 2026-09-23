// ───────────────────────────────────────────────────────────────
// Repair branches that have no `organization`. They were never
// attached to a tenant, so org-scoped queries (the branch dropdown,
// get_branch) hide them. Attach them to the super-admin org — the
// same org their seeded inventory already uses.
//
// Uses a raw $set of ONLY `organization` so we never serialize a
// `code: null`, which would otherwise collide on the unique sparse
// (organization, code) index.
//
// Run from the backend/ directory:
//   node scripts/fix_branch_org.js
// ───────────────────────────────────────────────────────────────
import "dotenv/config";
import mongoose from "mongoose";

import connectDb from "../config/mongodb.js";
import user_model from "../models/user_model.js";
import branch_model from "../models/branches_model.js";

const run = async () => {
  await connectDb();
  console.log("Connected.\n");

  // Default org = first admin (the super admin viewing the dashboard).
  const firstAdmin = await user_model.findOne({ role: "admin" }).sort({ createdAt: 1 });
  const org = firstAdmin?.organization || firstAdmin?._id;
  if (!org) throw new Error("No admin user found to use as organization.");
  console.log(`Using organization: ${org} (${firstAdmin.email})\n`);

  const orphanFilter = {
    $or: [{ organization: null }, { organization: { $exists: false } }],
  };

  const before = await branch_model.collection.find(orphanFilter).toArray();
  console.log(`Branches with no organization (${before.length}):`);
  for (const b of before) console.log(`  • ${b.name}`);

  // The old sparse (organization, code) index indexes a missing code as
  // null, so it would block assigning the same org to multiple code-less
  // branches. Drop it, then let syncIndexes rebuild it as the partial
  // index now defined on the schema.
  try {
    await branch_model.collection.dropIndex("organization_1_code_1");
    console.log("\nDropped stale sparse index organization_1_code_1.");
  } catch (err) {
    if (err.codeName !== "IndexNotFound" && err.code !== 27) throw err;
    console.log("\nNo stale organization_1_code_1 index to drop.");
  }

  const res = await branch_model.collection.updateMany(orphanFilter, {
    $set: { organization: org, is_active: true },
  });
  console.log(`Updated ${res.modifiedCount} branch(es).`);

  console.log("Rebuilding branch indexes (partial code index)…");
  await branch_model.syncIndexes();

  // Verify: every branch now resolves under the org scope.
  const visible = await branch_model
    .find({ organization: org, is_active: true })
    .sort({ name: 1 })
    .select("name");
  console.log(`\nBranches now visible for this org (${visible.length}):`);
  for (const b of visible) console.log(`  • ${b.name}`);

  console.log("\n✅ Done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("\n❌ Fix failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
