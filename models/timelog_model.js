// models/timelog_model.js
import mongoose from "mongoose";

const timelog_schema = new mongoose.Schema(
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
    clock_in: { type: Date, default: null },
    clock_out: { type: Date, default: null },
    hours_worked: { type: Number, default: 0 },
    hourly_rate: { type: Number, default: 0 },
    computed_salary: { type: Number, default: 0 },
    date: { type: String }, // "YYYY-MM-DD"
    is_manual: { type: Boolean, default: false }, // true if admin logged it
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

const timelog_model =
  mongoose.models.timelog || mongoose.model("timelog", timelog_schema);
export default timelog_model;
