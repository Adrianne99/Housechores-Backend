import mongoose from "mongoose";

const counter_schema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., "order:CAP:20260515"
  seq: { type: Number, default: 0 },
});

const counter_model =
  mongoose.models.Counter || mongoose.model("Counter", counter_schema);

export default counter_model;
