import mongoose from "mongoose";

const user_schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    // ─── Multi-tenancy ──────────────────────────────────────────
    // The organization (tenant) this user belongs to. For a root
    // admin this equals their own _id; every staff member they create
    // inherits the same value. All list queries are scoped by this so
    // one account never sees another account's data.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "branch_manager", "employee"],
      default: "employee",
    },
    is_active: { type: Boolean },
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
