import mongoose from "mongoose";

const branch_inventory_schema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      required: true,
    },
    stock: {
      current_stock: { type: Number, default: 0 },
      reorder_level: { type: Number, default: 0 },
      supplier: { type: String, default: "" },
    },
    pricing: {
      cost_per_unit: { type: Number, required: true },
      markup_value: { type: Number, required: true },
      selling_price: { type: Number, required: true },
    },
  },
  { timestamps: true },
);

branch_inventory_schema.index({ product: 1, branch: 1 }, { unique: true });

const branch_inventory_model =
  mongoose.models.branch_inventory ||
  mongoose.model("branch_inventories", branch_inventory_schema);

export default branch_inventory_model;
