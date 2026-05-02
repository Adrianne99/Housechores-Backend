import user_model from "../models/user_model.js";
import bcrypt from "bcryptjs";
export const get_user_data = async (req, res) => {
  try {
    const user = req.user; // ✅ already fetched by middleware

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      userData: {
        name: user.name,
        role: user.role,
        is_account_verified: user.is_account_verified,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const get_all_staff = async (req, res) => {
  try {
    const staff = await user_model
      .find({ role: { $in: ["admin", "branch_manager", "employee"] } })
      .select(
        "-password -verify_otp -verify_otp_expiry -reset_otp -reset_otp_expiry",
      )
      .populate("branch", "name address")
      .populate("created_by", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, staff });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const create_staff = async (req, res) => {
  try {
    const { name, email, password, role, branch } = req.body;

    if (!name || !email || !password || !role)
      return res
        .status(404)
        .json({ success: false, message: "All fields are required." });

    if (["branch_manager", "admin"].includes(role) && !branch) {
      res
        .status(400)
        .json({ success: false, message: "Branch is required for this role." });
    }

    const already_exist = await user_model.findOne({ email });

    if (already_exist)
      return res
        .status(409)
        .json({ success: false, message: "Email is already in use." });

    const hashed = await bcrypt.hash(password, 10);

    const user = await user_model.create({
      name,
      email,
      password: hashed,
      branch: branch || null,
      created_by: req.user._id,
    });

    await user.populate("branch", "name address");

    return res.status(201).json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      created_by: req.user.name,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_staff = async (req, res) => {
  try {
    const { id } = req.params;

    const { role, branch } = req.body;

    if (id === req.user._id.toString())
      return res
        .status(400)
        .json({ success: false, message: "You cannot edit your own account." });

    if (["branch_manager", "employee"].includes(role) && !branch)
      return res
        .status(400)
        .json({ success: false, message: "Branch is required for this role." });

    const user = await user_model
      .findByIdAndUpdate(id, { role, branch: branch || null }, { new: true })
      .select(
        "-password -verify_otp -verify_otp_expiry -reset_otp -reset_otp_expiry",
      )
      .populate("branch", "name address");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_staff = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString())
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });

    const user = await user_model.findByIdAndDelete(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });

    return res.status(200).json({ success: true, message: "Staff deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
