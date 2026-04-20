import mongoose, { mongo } from "mongoose";

const branch_schema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const branch_model =
  mongoose.models.branch || mongoose.model("branches", branch_schema);

export default branch_model;
