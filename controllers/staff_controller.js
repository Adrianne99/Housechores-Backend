import bcrypt from "bcryptjs";
import user_model from "../models/user_model.js";
import branch_model from "../models/branches_model.js";
import {
  can,
  check_branch_scope,
  should_scope_to_branch,
  org_of,
} from "../utils/permissions.js";

// Ensure a branch id supplied by an admin belongs to their own org.
const branch_belongs_to_org = async (req, branch_id) => {
  if (!branch_id) return true;
  const found = await branch_model.findOne({
    _id: branch_id,
    organization: org_of(req),
  });
  return !!found;
};

// ─── Get all staff ───────────────────────────────────────────
export const get_all_staff = async (req, res) => {
  try {
    const filter = {
      organization: org_of(req),
      role: { $in: ["admin", "branch_manager", "employee"] },
    };

    if (should_scope_to_branch(req.user)) {
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "No branch assigned to your account.",
        });
      }
      filter.role = "employee";
      filter.branch = req.user.branch;
    }

    const staff = await user_model
      .find(filter)
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

// ─── Create staff ────────────────────────────────────────────
export const create_staff = async (req, res) => {
  try {
    const { name, email, password, role, branch, hourly_rate } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }
    if (!["admin", "branch_manager", "employee"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }

    // Only owners can create admin accounts
    if (role === "admin" && !can(req.user, "canCreateAdmins")) {
      return res.status(403).json({
        success: false,
        message: "Only owners can create admin accounts.",
      });
    }

    let final_role = role;
    let final_branch = branch;

    if (req.user.role === "branch_manager") {
      if (role !== "employee") {
        return res.status(403).json({
          success: false,
          message: "Managers can only create employee accounts.",
        });
      }
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "No branch assigned to your account.",
        });
      }
      final_branch = req.user.branch;
    } else if (["owner", "admin"].includes(req.user.role)) {
      if (["branch_manager", "employee"].includes(role) && !branch) {
        return res.status(400).json({
          success: false,
          message: "Branch is required for this role.",
        });
      }
      if (branch && !(await branch_belongs_to_org(req, branch))) {
        return res.status(404).json({
          success: false,
          message: "Branch not found.",
        });
      }
    }

    const email_lower = email.toLowerCase().trim();
    const already_exist = await user_model.findOne({ email: email_lower });
    if (already_exist) {
      return res
        .status(409)
        .json({ success: false, message: "Email is already in use." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await user_model.create({
      name,
      email: email_lower,
      password: hashed,
      role: final_role,
      branch: final_branch || null,
      hourly_rate: Number(hourly_rate) >= 0 ? Number(hourly_rate) : 0,
      created_by: req.user._id,
      organization: org_of(req),
      is_active: true,
    });

    await user.populate("branch", "name address");

    return res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        hourly_rate: user.hourly_rate,
        is_active: user.is_active,
        created_by: req.user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update staff ────────────────────────────────────────────
export const update_staff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, branch, hourly_rate } = req.body;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot edit your own account.",
      });
    }

    const target = await user_model
      .findOne({ _id: id, organization: org_of(req) })
      .populate("branch", "name address");
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });
    }

    const scope = check_branch_scope(req.user, target);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    // Only owners can promote anyone to admin
    if (role === "admin" && !can(req.user, "canCreateAdmins")) {
      return res.status(403).json({
        success: false,
        message: "Only owners can promote users to admin.",
      });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (hourly_rate !== undefined) {
      const rate = Number(hourly_rate);
      updates.hourly_rate = Number.isFinite(rate) && rate >= 0 ? rate : 0;
    }

    // Owner/admin can change role + branch; managers can't
    if (["owner", "admin"].includes(req.user.role)) {
      if (role !== undefined) updates.role = role;
      if (branch !== undefined) updates.branch = branch || null;

      if (
        updates.role &&
        ["branch_manager", "employee"].includes(updates.role) &&
        !updates.branch
      ) {
        return res.status(400).json({
          success: false,
          message: "Branch is required for this role.",
        });
      }
      if (updates.branch && !(await branch_belongs_to_org(req, updates.branch))) {
        return res.status(404).json({
          success: false,
          message: "Branch not found.",
        });
      }
    } else if (req.user.role === "branch_manager") {
      if (role !== undefined && role !== "employee") {
        return res.status(403).json({
          success: false,
          message: "Managers cannot change staff roles.",
        });
      }
      if (branch !== undefined && String(branch) !== String(req.user.branch)) {
        return res.status(403).json({
          success: false,
          message: "Managers cannot transfer staff to another branch.",
        });
      }
    }

    const user = await user_model
      .findByIdAndUpdate(id, updates, { new: true })
      .select(
        "-password -verify_otp -verify_otp_expiry -reset_otp -reset_otp_expiry",
      )
      .populate("branch", "name address");

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Deactivate staff ────────────────────────────────────────
export const deactivate_staff = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
      });
    }

    const target = await user_model
      .findOne({ _id: id, organization: org_of(req) })
      .populate("branch", "name address");
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });
    }

    const scope = check_branch_scope(req.user, target);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    target.is_active = false;
    await target.save();

    return res.status(200).json({
      success: true,
      message: "Staff deactivated.",
      user: { _id: target._id, is_active: target.is_active },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reactivate staff ────────────────────────────────────────
export const reactivate_staff = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await user_model
      .findOne({ _id: id, organization: org_of(req) })
      .populate("branch", "name address");
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });
    }

    const scope = check_branch_scope(req.user, target);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    target.is_active = true;
    await target.save();

    return res.status(200).json({
      success: true,
      message: "Staff reactivated.",
      user: { _id: target._id, is_active: target.is_active },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Hard delete (owner/admin only via route middleware) ─────
export const delete_staff = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const target = await user_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found." });
    }

    // Route already enforces canDeleteStaff (owner/admin only), but
    // we still call check_branch_scope for defense-in-depth
    const scope = check_branch_scope(req.user, target);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    await user_model.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Staff deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
