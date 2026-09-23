import mongoose from "mongoose";

const held_item_schema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branch_inventories",
      default: null,
    },
    product_snapshot: {
      barcode: String,
      name: { type: String, required: true },
      brand: String,
      unit: String,
    },
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 },
    is_custom: { type: Boolean, default: false },
  },
  { _id: false },
);

const held_order_schema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    customer_name: String, // optional label
    items: [held_item_schema],
    note: String,
  },
  { timestamps: true },
);

// Auto-expire held orders after 24 hours (cleanup)
held_order_schema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const held_order_model =
  mongoose.models.HeldOrder || mongoose.model("HeldOrder", held_order_schema);

export default held_order_model;
