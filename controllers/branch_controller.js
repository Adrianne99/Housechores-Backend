import branch_inventory_model from "../models/branch_inventory_model.js";
import branch_model from "../models/branches_model.js";
import product_model from "../models/product_model.js";
import user_model from "../models/user_model.js";
import { org_of } from "../utils/permissions.js";

export const get_branch = async (req, res) => {
  try {
    const branches = await branch_model
      .find({ organization: org_of(req), is_active: true })
      .sort({ name: 1 });
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_single_branch = async (req, res) => {
  try {
    const { role, branch } = req.user;

    if (
      ["branch_manager", "employee"].includes(role) &&
      branch._id.toString() !== req.params.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only view your assigned branch.",
      });
    }

    const found_branch = await branch_model.findOne({
      _id: req.params.id,
      organization: org_of(req),
    });

    if (!found_branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });
    }

    return res.status(200).json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const create_branch = async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Branch name is required." });

    const branch_already_exist = await branch_model.findOne({
      organization: org_of(req),
      name: name.trim(),
    });

    if (branch_already_exist)
      return res
        .status(409)
        .json({ success: false, message: "Branch name already exist." });

    const branch = new branch_model({
      name,
      address,
      organization: org_of(req),
      created_by: req.user._id,
    });
    await branch.save();

    return res.status(201).json({ success: true, branch }); //201 = Created
  } catch (error) {
    console.error("create_branch error:", error); // ← add this
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_branch = async (req, res) => {
  try {
    const { name, address, is_active } = req.body;

    const branch = await branch_model.findOneAndUpdate(
      { _id: req.params.id, organization: org_of(req) },
      {
        name,
        address,
        is_active,
      },
      { new: true },
    );

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });
    return res.status(200).json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_branch = async (req, res) => {
  try {
    const branch = await branch_model.findOneAndDelete({
      _id: req.params.id,
      organization: org_of(req),
    });

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });

    const inventories = await branch_inventory_model.find({
      branch: req.params.id,
    });
    await branch_inventory_model.deleteMany({ branch: req.params.id });

    for (const inv of inventories) {
      const remaining = await branch_inventory_model.countDocuments({
        product: inv.product,
      });
      if (remaining === 0) {
        await product_model.findByIdAndDelete(inv.product);
      }
    }

    return res.status(200).json({ success: true, message: "Branch deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assign_branch = async (req, res) => {
  try {
    const { user_id, branch_id } = req.body;

    const user = await user_model.findOne({
      _id: user_id,
      organization: org_of(req),
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (["admin"].includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: "Owner account cannot be assigned to a branch.",
      });
    }

    const branch = await branch_model.findOne({
      _id: branch_id,
      organization: org_of(req),
    });
    if (!branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });
    }

    user.branch = branch_id;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} assigned to ${branch.name}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const get_all_branches = async (req, res) => {
  try {
    const branches = await branch_model
      .find({ organization: org_of(req) })
      .populate("created_by", "name email role");
    res.status(200).json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const branch_label = async (req, res) => {
  try {
    const branch = await branch_model.findOne({
      _id: req.params.id,
      organization: org_of(req),
    });

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });

    return res.status(200).json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
