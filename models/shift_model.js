import mongoose from "mongoose";

const shift_schema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      required: true,
    },
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    hours: { type: Number, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true },
);

const shift_model =
  mongoose.models.shift || mongoose.model("shift", shift_schema);
export default shift_model;
