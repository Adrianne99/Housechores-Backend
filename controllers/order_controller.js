import mongoose from "mongoose";
import order_model from "../models/order_model.js";
import counter_model from "../models/counter_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";
import branch_model from "../models/branches_model.js";
import { can, org_of } from "../utils/permissions.js";

const VAT_RATE = 0.12;

// VAT back-calculation from VAT-inclusive total
// total = base + vat = base * 1.12 → vat = total * 0.12 / 1.12
const calculate_vat = (total) =>
  +((total * VAT_RATE) / (1 + VAT_RATE)).toFixed(2);

// ─── Generate human-readable order number ────────────────────
// Format: ORD-YYYYMMDD-NNNN (daily counter, per branch)
const generate_order_number = async (branch_id, org_id, session) => {
  const branch = await branch_model
    .findOne({ _id: branch_id, organization: org_id })
    .session(session);
  if (!branch) throw new Error("Branch not found.");

  // Use branch.code if set, otherwise first 3 letters of name
  const branch_code = (branch.code ?? branch.name?.slice(0, 3) ?? "XXX")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const date_str = `${yyyy}${mm}${dd}`;

  // Scope the daily counter to the organization so two tenants that
  // happen to share a branch code never collide on order numbers.
  const counter_key = `order:${org_id}:${branch_code}:${date_str}`;

  // Atomic increment — race-condition safe
  const counter = await counter_model.findByIdAndUpdate(
    counter_key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, session },
  );

  const padded = String(counter.seq).padStart(4, "0");
  return `ORD-${branch_code}-${date_str}-${padded}`;
};

// ─── Create order ────────────────────────────────────────────
export const create_order = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, payment, discount_amount = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Order must have at least one item.",
      });
    }

    if (!payment?.method) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payment method is required.",
      });
    }

    // Determine branch (employees/managers use their own)
    let branch;
    if (["employee", "branch_manager"].includes(req.user.role)) {
      if (!req.user.branch) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "No branch assigned to your account.",
        });
      }
      branch = req.user.branch;
    } else {
      branch = req.body.branch || req.user.branch;
      if (!branch) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Branch is required.",
        });
      }
    }

    // Build line items + atomically decrement stock
    const order_items = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.inventory_id || !item.quantity || item.quantity <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Each item needs inventory_id and quantity > 0.",
        });
      }

      // ATOMIC: only decrement if enough stock exists
      // Prevents two cashiers from overselling the same product
      const inventory = await branch_inventory_model
        .findOneAndUpdate(
          {
            _id: item.inventory_id,
            branch: branch,
            organization: org_of(req),
            "stock.current_stock": { $gte: item.quantity },
          },
          { $inc: { "stock.current_stock": -item.quantity } },
          { new: true, session },
        )
        .populate("product");

      if (!inventory) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: `Insufficient stock or invalid product for item ${item.inventory_id}.`,
        });
      }

      const unit_price = inventory.pricing.selling_price;
      const line_subtotal = +(unit_price * item.quantity).toFixed(2);

      order_items.push({
        inventory: inventory._id,
        product_snapshot: {
          barcode: inventory.product.barcode,
          name: inventory.product.name,
          brand: inventory.product.brand,
          unit: inventory.product.unit,
        },
        quantity: item.quantity,
        unit_price,
        subtotal: line_subtotal,
      });

      subtotal += line_subtotal;
    }

    subtotal = +subtotal.toFixed(2);

    const safe_discount = Math.max(0, Math.min(discount_amount, subtotal));
    const total = +(subtotal - safe_discount).toFixed(2);
    const vat_amount = calculate_vat(total);

    // Validate cash payment
    if (payment.method === "cash") {
      const tendered = Number(payment.amount_tendered);
      if (!Number.isFinite(tendered) || tendered < total) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient cash tendered. Total is ₱${total}.`,
        });
      }
      payment.change = +(tendered - total).toFixed(2);
    }

    const order_number = await generate_order_number(
      branch,
      org_of(req),
      session,
    );

    const [order] = await order_model.create(
      [
        {
          order_number,
          organization: org_of(req),
          branch,
          cashier: req.user._id,
          items: order_items,
          subtotal,
          discount_amount: safe_discount,
          total,
          vat_amount,
          payment: {
            method: payment.method,
            amount_tendered: payment.amount_tendered,
            change: payment.change,
            reference: payment.reference,
          },
          status: "completed",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    await order.populate("branch", "name address");
    await order.populate("cashier", "name email");

    return res.status(201).json({ success: true, order });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ─── List orders (scoped by role) ────────────────────────────
export const get_orders = async (req, res) => {
  try {
    const filter = { organization: org_of(req) };

    if (req.user.role === "employee") {
      filter.cashier = req.user._id;
      filter.branch = req.user.branch;
    } else if (req.user.role === "branch_manager") {
      filter.branch = req.user.branch;
    } else if (["admin", "owner"].includes(req.user.role)) {
      if (req.query.branch) filter.branch = req.query.branch;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.cashier) filter.cashier = req.query.cashier;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = parseInt(req.query.skip) || 0;

    const [orders, total] = await Promise.all([
      order_model
        .find(filter)
        .populate("branch", "name")
        .populate("cashier", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      order_model.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, orders, total });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get one order ───────────────────────────────────────────
export const get_order_by_id = async (req, res) => {
  try {
    const order = await order_model
      .findOne({ _id: req.params.id, organization: org_of(req) })
      .populate("branch", "name address")
      .populate("cashier", "name email")
      .populate("voided_by", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // Scope by role
    if (req.user.role === "employee") {
      if (String(order.cashier._id) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own orders.",
        });
      }
    } else if (req.user.role === "branch_manager") {
      if (String(order.branch._id) !== String(req.user.branch)) {
        return res.status(403).json({
          success: false,
          message: "You can only view orders from your branch.",
        });
      }
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Void order (restores stock) ─────────────────────────────
export const void_order = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Void reason is required.",
      });
    }

    const order = await order_model
      .findOne({ _id: id, organization: org_of(req) })
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    if (order.status !== "completed") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot void an order that is already ${order.status}.`,
      });
    }

    // Branch managers can void within their branch
    if (req.user.role === "branch_manager") {
      if (String(order.branch) !== String(req.user.branch)) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "You can only void orders from your branch.",
        });
      }
    } else if (!can(req.user, "canVoidAnyOrder")) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "You do not have permission to void orders.",
      });
    }

    // Restore stock for each item
    for (const item of order.items) {
      await branch_inventory_model.findByIdAndUpdate(
        item.inventory,
        { $inc: { "stock.current_stock": item.quantity } },
        { session },
      );
    }

    order.status = "voided";
    order.voided_at = new Date();
    order.voided_by = req.user._id;
    order.void_reason = reason.trim();
    await order.save({ session });

    await session.commitTransaction();

    await order.populate("voided_by", "name email");

    return res.status(200).json({ success: true, order });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
