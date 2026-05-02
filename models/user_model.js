import mongoose from "mongoose";

const user_schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "branch_manager", "employee"],
      default: "employee",
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "branches",
      default: null,
    },
    hourly_rate: { type: Number, default: 0 },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    verify_otp: { type: String, default: "" },
    verify_otp_expiry: { type: Number, default: 0 },
    is_account_verified: { type: Boolean, default: false },
    reset_otp: { type: String, default: "" },
    reset_otp_expiry: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

const user_model = mongoose.models.user || mongoose.model("user", user_schema);

export default user_model;
