import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    brand: String,
    category: String,
    description: String,
    unit: { type: String, default: "piece" },

    stock_management: {
      current_stock: { type: Number, default: 0 },
      reorder_level: { type: Number, default: 5 },
      supplier: String,
    },

    pricing: {
      cost_per_unit: Number, // Owner Only
      markup_type: { type: String, default: "fixed" },
      markup_value: Number, // Owner Only
      selling_price: Number, // Staff Visible
    },

    status: {
      type: String,
      enum: ["active", "out_of_stock", "discontinued", "low_stock"],
      default: "active",
    },
    updated_by: String,
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
