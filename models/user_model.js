import mongoose from "mongoose";

const user_schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["employee", "admin"],
      defualt: "employee",
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
