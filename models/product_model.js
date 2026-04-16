import mongoose from "mongoose";

const stocks_schema = new mongoose.Schema(
  {
    current_stock: { type: Number, required: true, default: 0 },
    reorder_level: { type: Number, required: true, default: 0 },
    supplier: { type: String, default: "" },
  },
  { _id: false },
);

const pricing_schema = new mongoose.Schema(
  {
    cost_per_unit: { type: Number, required: true },
    markup_value: { type: Number, required: true },
    selling_price: { type: Number, required: true },
  },
  { _id: false },
);

const product_schema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    stock_management: { type: stocks_schema, required: true },
    pricing: { type: pricing_schema, required: true },
  },
  { timestamps: true },
);

const product_model =
  mongoose.models.product || mongoose.model("products", product_schema);

export default product_model;
