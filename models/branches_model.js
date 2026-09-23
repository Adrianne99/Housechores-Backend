import mongoose from "mongoose";

const branch_schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true },
);

// Branch name + code are unique PER organization, not globally.
branch_schema.index({ organization: 1, name: 1 }, { unique: true });
// Code is unique per org ONLY when actually set. A `sparse` compound
// index does NOT work here — because every branch has `organization`,
// a compound sparse index still indexes a missing `code` as null, so
// two code-less branches in the same org would collide. A partial
// index keyed on string codes is what we actually want.
branch_schema.index(
  { organization: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } },
);

const branch_model =
  mongoose.models.branch || mongoose.model("branches", branch_schema);

export default branch_model;
