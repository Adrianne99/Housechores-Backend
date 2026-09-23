import user_model from "../models/user_model.js";
import bcrypt from "bcryptjs";

export const get_user_data = async (req, res) => {
  try {
    const user = await user_model
      .findById(req.user._id)
      .select(
        "-password -verify_otp -verify_otp_expiry -reset_otp -reset_otp_expiry",
      )
      .populate("branch", "name address");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      userData: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        is_account_verified: user.is_account_verified,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
