import mongoose from "mongoose";

const order_item_schema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branch_inventories",
      required: true,
    },
    // Snapshot at sale time — survives product edits/deletes later
    product_snapshot: {
      barcode: String,
      name: String,
      brand: String,
      unit: String,
    },
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 }, // VAT-inclusive
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const order_schema = new mongoose.Schema(
  {
    order_number: { type: String, required: true, index: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      required: true,
      index: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    items: [order_item_schema],

    subtotal: { type: Number, required: true, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    vat_amount: { type: Number, required: true, min: 0 },

    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "gcash"],
        required: true,
      },
      amount_tendered: { type: Number, min: 0 },
      change: { type: Number, min: 0 },
      reference: String,
    },

    status: {
      type: String,
      enum: ["completed", "voided", "refunded"],
      default: "completed",
      index: true,
    },
    voided_at: Date,
    voided_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    void_reason: String,
  },
  { timestamps: true },
);

order_schema.index({ branch: 1, createdAt: -1 });
// Order number is unique per organization (branch codes can repeat across tenants).
order_schema.index({ organization: 1, order_number: 1 }, { unique: true });

const order_model =
  mongoose.models.Order || mongoose.model("order", order_schema);

export default order_model;
