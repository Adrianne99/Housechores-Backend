import held_order_model from "../models/held_order_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";
import { can, should_scope_to_branch, org_of } from "../utils/permissions.js";

// ─── Helper: resolve which branch the user is operating in ───
const resolve_branch = (req) => {
  // Scoped roles always use their own branch
  if (should_scope_to_branch(req.user)) {
    return { branch: req.user.branch, error: null };
  }

  // Admin/owner can pick any branch via body or query, falling back to their own
  const branch = req.body?.branch || req.query?.branch || req.user.branch;
  if (!branch) {
    return {
      branch: null,
      error: { status: 400, message: "Branch is required." },
    };
  }
  return { branch, error: null };
};

// ─── Helper: verify user can operate on a target held order ──
const can_access_held = (req, held) => {
  if (should_scope_to_branch(req.user)) {
    if (String(held.branch) !== String(req.user.branch)) {
      return {
        allowed: false,
        status: 403,
        message: "Not your branch's held order.",
      };
    }
  }
  return { allowed: true };
};

// ─── List held orders ────────────────────────────────────────
export const get_held_orders = async (req, res) => {
  try {
    if (!can(req.user, "canHoldOrders")) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view held orders.",
      });
    }

    const filter = { organization: org_of(req) };

    if (should_scope_to_branch(req.user)) {
      if (!req.user.branch) {
        return res.status(403).json({
          success: false,
          message: "No branch assigned to your account.",
        });
      }
      filter.branch = req.user.branch;
    } else if (req.query.branch) {
      filter.branch = req.query.branch;
    }

    const held = await held_order_model
      .find(filter)
      .populate("cashier", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, held_orders: held });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Hold a cart ─────────────────────────────────────────────
export const hold_order = async (req, res) => {
  try {
    if (!can(req.user, "canHoldOrders")) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to hold orders.",
      });
    }

    const { items, customer_name, note } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot hold an empty cart.",
      });
    }

    const { branch, error } = resolve_branch(req);
    if (error) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    // Sanitize items — store snapshot, no stock decrement
    const sanitized_items = items.map((item) => ({
      inventory: item.is_custom ? null : item.inventory_id || null,
      product_snapshot: {
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        unit: item.unit,
      },
      quantity: Number(item.quantity) || 1,
      unit_price: +Number(item.unit_price).toFixed(2) || 0,
      is_custom: !!item.is_custom,
    }));

    const held = await held_order_model.create({
      branch,
      organization: org_of(req),
      cashier: req.user._id,
      customer_name: customer_name?.trim(),
      note: note?.trim(),
      items: sanitized_items,
    });

    await held.populate("cashier", "name");

    return res.status(201).json({ success: true, held_order: held });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Resume a held order ─────────────────────────────────────
export const resume_held_order = async (req, res) => {
  try {
    if (!can(req.user, "canHoldOrders")) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to resume held orders.",
      });
    }

    const { id } = req.params;
    const held = await held_order_model
      .findOne({ _id: id, organization: org_of(req) })
      .populate("cashier", "name");

    if (!held) {
      return res
        .status(404)
        .json({ success: false, message: "Held order not found." });
    }

    const scope = can_access_held(req, held);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    // Re-fetch current stock and price for each non-custom item
    const refreshed_items = [];
    for (const item of held.items) {
      if (item.is_custom || !item.inventory) {
        refreshed_items.push({ ...item.toObject(), available_stock: null });
        continue;
      }

      const inventory = await branch_inventory_model
        .findById(item.inventory)
        .populate("product");

      if (!inventory) {
        refreshed_items.push({
          ...item.toObject(),
          available_stock: 0,
          unavailable: true,
        });
        continue;
      }

      refreshed_items.push({
        ...item.toObject(),
        unit_price: inventory.pricing.selling_price,
        available_stock: inventory.stock.current_stock,
      });
    }

    return res.status(200).json({
      success: true,
      held_order: {
        ...held.toObject(),
        items: refreshed_items,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete a held order ─────────────────────────────────────
export const delete_held_order = async (req, res) => {
  try {
    if (!can(req.user, "canHoldOrders")) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete held orders.",
      });
    }

    const { id } = req.params;
    const held = await held_order_model.findOne({
      _id: id,
      organization: org_of(req),
    });

    if (!held) {
      return res
        .status(404)
        .json({ success: false, message: "Held order not found." });
    }

    const scope = can_access_held(req, held);
    if (!scope.allowed) {
      return res
        .status(scope.status)
        .json({ success: false, message: scope.message });
    }

    await held_order_model.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: "Held order discarded." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
