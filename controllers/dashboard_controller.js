import mongoose from "mongoose";
import order_model from "../models/order_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";
import branch_model from "../models/branches_model.js";
import { org_of } from "../utils/permissions.js";

const as_object_id = (v) =>
  v ? new mongoose.Types.ObjectId(String(v._id ?? v)) : null;

const pct_change = (current, previous) => {
  if (!previous) return current > 0 ? 100 : 0;
  return +(((current - previous) / previous) * 100).toFixed(1);
};

const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

// ─── Dashboard statistics (scoped by org + role) ─────────────
export const get_dashboard_stats = async (req, res) => {
  try {
    const org = org_of(req);
    const { role } = req.user;

    // Sales scope mirrors get_orders: employees see only their own sales,
    // managers their branch, admins everything (optionally one branch).
    const sales_match = { organization: as_object_id(org), status: "completed" };
    const inv_match = { organization: as_object_id(org) };

    if (role === "employee") {
      sales_match.branch = as_object_id(req.user.branch);
      sales_match.cashier = as_object_id(req.user._id);
      inv_match.branch = as_object_id(req.user.branch);
    } else if (role === "branch_manager") {
      sales_match.branch = as_object_id(req.user.branch);
      inv_match.branch = as_object_id(req.user.branch);
    } else if (req.query.branch) {
      sales_match.branch = as_object_id(req.query.branch);
      inv_match.branch = as_object_id(req.query.branch);
    }

    // ─── Date boundaries for trends ──────────────────────────
    const now = new Date();
    const start_today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start_month = new Date(now.getFullYear(), now.getMonth(), 1);
    const start_last_month = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start_14 = new Date(start_today);
    start_14.setDate(start_14.getDate() - 13);

    const [
      totalsAgg,
      periodsAgg,
      seriesAgg,
      paymentAgg,
      topAgg,
      branchAgg,
      invAgg,
      recent,
      branches_count,
    ] = await Promise.all([
      // All-time totals
      order_model.aggregate([
        { $match: sales_match },
        {
          $group: {
            _id: null,
            total_sales: { $sum: "$total" },
            order_count: { $sum: 1 },
            products_sold: { $sum: { $sum: "$items.quantity" } },
            total_vat: { $sum: "$vat_amount" },
            total_discount: { $sum: "$discount_amount" },
          },
        },
      ]),

      // Today / this month / last month, for trend badges
      order_model.aggregate([
        { $match: { ...sales_match, createdAt: { $gte: start_last_month } } },
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: start_today } } },
              { $group: { _id: null, sales: { $sum: "$total" }, orders: { $sum: 1 } } },
            ],
            this_month: [
              { $match: { createdAt: { $gte: start_month } } },
              {
                $group: {
                  _id: null,
                  sales: { $sum: "$total" },
                  orders: { $sum: 1 },
                  products: { $sum: { $sum: "$items.quantity" } },
                },
              },
            ],
            last_month: [
              { $match: { createdAt: { $gte: start_last_month, $lt: start_month } } },
              {
                $group: {
                  _id: null,
                  sales: { $sum: "$total" },
                  orders: { $sum: 1 },
                  products: { $sum: { $sum: "$items.quantity" } },
                },
              },
            ],
          },
        },
      ]),

      // Daily sales for the last 14 days (chart)
      order_model.aggregate([
        { $match: { ...sales_match, createdAt: { $gte: start_14 } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            sales: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Payment method split
      order_model.aggregate([
        { $match: sales_match },
        {
          $group: {
            _id: "$payment.method",
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // Top selling products
      order_model.aggregate([
        { $match: sales_match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product_snapshot.name",
            qty: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.subtotal" },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),

      // Sales by branch
      order_model.aggregate([
        { $match: sales_match },
        {
          $group: {
            _id: "$branch",
            sales: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "branches",
            localField: "_id",
            foreignField: "_id",
            as: "branch",
          },
        },
        { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: "$branch.name", sales: 1, orders: 1 } },
        { $sort: { sales: -1 } },
      ]),

      // Inventory health
      branch_inventory_model.aggregate([
        { $match: inv_match },
        {
          $group: {
            _id: null,
            stock_value: {
              $sum: {
                $multiply: ["$pricing.selling_price", "$stock.current_stock"],
              },
            },
            total_units: { $sum: "$stock.current_stock" },
            products: { $addToSet: "$product" },
            low_stock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$stock.current_stock", 0] },
                      { $lte: ["$stock.current_stock", "$stock.reorder_level"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            out_of_stock: {
              $sum: { $cond: [{ $lte: ["$stock.current_stock", 0] }, 1, 0] },
            },
          },
        },
      ]),

      // Recent orders for the activity feed
      order_model
        .find(sales_match)
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("branch", "name")
        .populate("cashier", "name")
        .lean(),

      role === "admin"
        ? branch_model.countDocuments({ organization: org, is_active: true })
        : Promise.resolve(1),
    ]);

    const totals = first(totalsAgg) ?? {};
    const periods = first(periodsAgg) ?? {};
    const today = first(periods.today) ?? { sales: 0, orders: 0 };
    const this_month = first(periods.this_month) ?? { sales: 0, orders: 0, products: 0 };
    const last_month = first(periods.last_month) ?? { sales: 0, orders: 0, products: 0 };
    const inv = first(invAgg) ?? {};

    const order_count = totals.order_count ?? 0;
    const total_sales = totals.total_sales ?? 0;

    // Fill missing days so the chart always has 14 buckets.
    const series_map = new Map(seriesAgg.map((d) => [d._id, d]));
    const sales_series = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start_14);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const hit = series_map.get(key);
      sales_series.push({
        date: key,
        sales: hit?.sales ?? 0,
        orders: hit?.orders ?? 0,
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totals: {
          total_sales,
          order_count,
          products_sold: totals.products_sold ?? 0,
          avg_order_value: order_count ? +(total_sales / order_count).toFixed(2) : 0,
          total_vat: totals.total_vat ?? 0,
          total_discount: totals.total_discount ?? 0,
        },
        trends: {
          today_sales: today.sales ?? 0,
          today_orders: today.orders ?? 0,
          month_sales: this_month.sales ?? 0,
          last_month_sales: last_month.sales ?? 0,
          sales_change: pct_change(this_month.sales ?? 0, last_month.sales ?? 0),
          orders_change: pct_change(this_month.orders ?? 0, last_month.orders ?? 0),
          products_change: pct_change(this_month.products ?? 0, last_month.products ?? 0),
        },
        inventory: {
          stock_value: +(inv.stock_value ?? 0).toFixed(2),
          total_units: inv.total_units ?? 0,
          total_products: inv.products?.length ?? 0,
          low_stock: inv.low_stock ?? 0,
          out_of_stock: inv.out_of_stock ?? 0,
        },
        branches_count,
        sales_series,
        payment_breakdown: paymentAgg.map((p) => ({
          method: p._id ?? "unknown",
          total: p.total,
          count: p.count,
        })),
        top_products: topAgg.map((t) => ({
          name: t._id ?? "Unknown",
          qty: t.qty,
          revenue: t.revenue,
        })),
        sales_by_branch: branchAgg,
        recent_orders: recent.map((o) => ({
          _id: o._id,
          order_number: o.order_number,
          total: o.total,
          status: o.status,
          branch: o.branch?.name ?? "—",
          cashier: o.cashier?.name ?? "—",
          item_count: o.items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
          createdAt: o.createdAt,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
