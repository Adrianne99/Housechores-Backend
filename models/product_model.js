import mongoose from "mongoose";

const product_schema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
  },
  { timestamps: true },
);

const product_model =
  mongoose.models.product || mongoose.model("products", product_schema);

export default product_model;
