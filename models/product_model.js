import mongoose from "mongoose";

const product_schema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    photo: { type: String, default: "" },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Barcode is unique PER organization — two tenants may carry the same
// product barcode without colliding.
product_schema.index({ organization: 1, barcode: 1 }, { unique: true });

const product_model =
  mongoose.models.product || mongoose.model("products", product_schema);

export default product_model;
