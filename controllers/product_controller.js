import product_model from "../models/product_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";
import branch_model from "../models/branches_model.js";
import {
  can,
  check_branch_scope,
  should_scope_to_branch,
  org_of,
  PERMISSIONS,
} from "../utils/permissions.js";

// Verify an inventory row belongs to the caller's org and, for scoped
// roles (manager), to their own branch. Replaces the previously-undefined
// check_branch_ownership helper.
const check_inventory_access = (req, inventory) => {
  if (String(inventory.organization) !== String(org_of(req))) {
    return { allowed: false, message: "Product not found." };
  }
  if (should_scope_to_branch(req.user)) {
    const user_branch = String(req.user.branch?._id ?? req.user.branch);
    if (user_branch !== String(inventory.branch)) {
      return {
        allowed: false,
        message: "You can only manage products in your own branch.",
      };
    }
  }
  return { allowed: true };
};

export const get_products = async (req, res) => {
  try {
    const inventory = await branch_inventory_model
      .find(req.branch_filter)
      .populate("product")
      .populate("branch")
      .sort({ createdAt: -1 });

    const products = inventory.map((inv) => ({
      _id: inv._id,
      product_id: inv.product._id,
      barcode: inv.product.barcode,
      name: inv.product.name,
      brand: inv.product.brand,
      category: inv.product.category,
      unit: inv.product.unit,
      photo: inv.product.photo,
      branch: inv.branch,
      stock_management: inv.stock,
      pricing: inv.pricing,
      createdAt: inv.createdAt,
    }));

    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_product_by_barcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    const product = await product_model.findOne({
      barcode,
      organization: org_of(req),
    });
    if (!product) return res.json({ success: false });

    const inventories = await branch_inventory_model
      .find({ product: product._id, organization: org_of(req) })
      .populate("branch");

    const existing_branches = inventories.map((inv) =>
      inv.branch._id.toString(),
    );

    return res.json({ success: true, product, existing_branches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const create_product = async (req, res) => {
  try {
    const {
      barcode,
      name,
      brand,
      category,
      unit,
      photo,
      stock_management,
      pricing,
    } = req.body;

    // ⬇️ NEW: SECURITY — force the branch based on user role
    let branch;
    if (req.user.role === "branch_manager") {
      // Manager → always their own branch (ignore whatever frontend sent)
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "No branch assigned to your account. Contact your admin.",
        });
      }
      branch = req.user.branch;
    } else {
      // Admin → branch comes from frontend (they can choose any)
      branch = req.body.branch;
      if (!branch) {
        return res.status(400).json({
          success: false,
          message: "Branch is required.",
        });
      }
    }

    // ─── Validate required fields ───────────────────────────────
    if (!barcode || !name || !brand || !category || !unit) {
      return res.status(400).json({
        success: false,
        message: "All product fields are required.",
      });
    }

    // ─── Make sure the branch belongs to this organization ──────
    const owning_branch = await branch_model.findOne({
      _id: branch,
      organization: org_of(req),
    });
    if (!owning_branch) {
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });
    }

    // ─── Check if product already exists (by barcode, per org) ──
    let product = await product_model.findOne({
      barcode,
      organization: org_of(req),
    });

    if (!product) {
      // First time we've seen this product — create it
      product = await product_model.create({
        barcode,
        name,
        brand,
        category,
        unit,
        photo: photo ?? "",
        organization: org_of(req),
      });
    }

    // ─── Check if this branch already carries this product ──────
    const existing = await branch_inventory_model.findOne({
      product: product._id,
      branch,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This product already exists in this branch.",
      });
    }

    // ─── Create the branch inventory entry ──────────────────────
    const inventory = await branch_inventory_model.create({
      product: product._id,
      branch,
      organization: org_of(req),
      stock: {
        current_stock: Number(stock_management.current_stock),
        reorder_level: Number(stock_management.reorder_level),
        supplier: stock_management.supplier ?? "",
      },
      pricing: {
        cost_per_unit: Number(pricing.cost_per_unit),
        markup_value: Number(pricing.markup_value),
        selling_price: Number(pricing.selling_price),
      },
    });

    return res.status(201).json({
      success: true,
      product,
      inventory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_stock = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_stock, reorder_level, supplier } = req.body;

    // ─── Validate ─────────────────────────────────────────────
    if (current_stock === undefined || reorder_level === undefined) {
      return res.status(400).json({
        success: false,
        message: "Current stock and reorder level are required.",
      });
    }

    if (Number(current_stock) < 0 || Number(reorder_level) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock values cannot be negative.",
      });
    }

    // ─── Read ─────────────────────────────────────────────────
    const inventory = await branch_inventory_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // ─── Check ────────────────────────────────────────────────
    const check = check_inventory_access(req, inventory);
    if (!check.allowed) {
      return res.status(403).json({ success: false, message: check.message });
    }

    // ─── Write ────────────────────────────────────────────────
    const updated = await branch_inventory_model.findByIdAndUpdate(
      id,
      {
        $set: {
          "stock.current_stock": Number(current_stock),
          "stock.reorder_level": Number(reorder_level),
          ...(supplier !== undefined && { "stock.supplier": supplier }),
        },
      },
      { new: true },
    );

    return res.status(200).json({ success: true, inventory: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_name = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand } = req.body;

    if (!name || !brand)
      return res.status(400).json({
        success: false,
        message: "Name and Brand is required.",
      });

    const inventory = await branch_inventory_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const product = await product_model.findByIdAndUpdate(
      inventory.product,
      { name, brand }, // ← was { name: brand } which set name to brand's value
      { new: true },
    );

    return res.status(200).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_products = async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode, name, brand, category, unit, stock_management, pricing } =
      req.body;

    if (
      !barcode ||
      !name ||
      !brand ||
      !category ||
      !unit ||
      !stock_management ||
      !pricing
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Never allow the tenant boundary to be reassigned via the body.
    const { organization, _id, ...safe_updates } = req.body;

    const product = await product_model.findOneAndUpdate(
      { _id: id, organization: org_of(req) },
      { $set: safe_updates },
      { new: true, runValidators: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    return res.status(200).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_barcode = async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode } = req.body;

    const inventory = await branch_inventory_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Inventory not found." });

    const existing = await product_model.findOne({
      barcode,
      organization: org_of(req),
      _id: { $ne: inventory.product },
    });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Barcode already in use." });
    }

    const product = await product_model.findByIdAndUpdate(
      inventory.product,
      { barcode },
      { new: true },
    );

    return res.status(200).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_category = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!category)
      return res
        .status(400)
        .json({ success: false, message: "Category is required." });

    const inventory = await branch_inventory_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const product = await product_model.findByIdAndUpdate(
      inventory.product, // ← was using id directly which is the inventory id, not product id
      { $set: { category } },
      { new: true, runValidators: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    return res.status(200).json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_price = async (req, res) => {
  try {
    const { id } = req.params;
    const { cost_per_unit, selling_price, markup_value } = req.body;

    if (!selling_price || !markup_value || !cost_per_unit) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const inventory = await branch_inventory_model.findOne({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const check = check_inventory_access(req, inventory);
    if (!check.allowed) {
      return res.status(403).json({ success: false, message: check.message });
    }

    const updated = await branch_inventory_model.findByIdAndUpdate(
      id,
      {
        $set: {
          "pricing.markup_value": Number(markup_value),
          "pricing.selling_price": Number(selling_price),
          "pricing.cost_per_unit": Number(cost_per_unit),
        },
      },
      { new: true },
    );

    return res.status(200).json({ success: true, inventory: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_supplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier } = req.body;

    const inventory = await branch_inventory_model.findOneAndUpdate(
      { _id: id, organization: org_of(req) },
      { $set: { "stock.supplier": supplier } },
      { new: true },
    );

    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found." });

    return res.status(200).json({ success: true, inventory }); // ← was returning `product` which doesn't exist
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_product = async (req, res) => {
  try {
    const { id } = req.params;
    const inventory = await branch_inventory_model.findOneAndDelete({
      _id: id,
      organization: org_of(req),
    });
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    const remaining = await branch_inventory_model.countDocuments({
      product: inventory.product,
    });

    if (remaining === 0) {
      await product_model.findByIdAndDelete(inventory.product);
    }

    return res
      .status(200)
      .json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_bulk = async (req, res) => {
  try {
    const { ids } = req.body;

    const inventories = await branch_inventory_model.find({
      _id: { $in: ids },
      organization: org_of(req),
    });
    await branch_inventory_model.deleteMany({
      _id: { $in: inventories.map((inv) => inv._id) },
    });

    for (const inventory of inventories) {
      const remaining = await branch_inventory_model.countDocuments({
        product: inventory.product,
      });
      if (remaining === 0) {
        await product_model.findByIdAndDelete(inventory.product);
      }
    }

    return res
      .status(200)
      .json({ success: true, message: `${ids.length} products deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_all = async (req, res) => {
  try {
    await branch_inventory_model.deleteMany({ organization: org_of(req) });
    await product_model.deleteMany({ organization: org_of(req) });
    return res
      .status(200)
      .json({ success: true, message: "All products deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
