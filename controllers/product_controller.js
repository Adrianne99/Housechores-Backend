import product_model from "../models/product_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";

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
    const product = await product_model.findOne({ barcode });
    if (!product) return res.json({ success: false });

    const inventories = await branch_inventory_model
      .find({ product: product._id })
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
      branch,
    } = req.body;

    if (!branch) {
      return res
        .status(400)
        .json({ success: false, message: "Branch is required." });
    }

    let product = await product_model.findOne({ barcode });
    if (!product) {
      product = await product_model.create({
        barcode,
        name,
        brand,
        category,
        unit,
        photo,
      });
    }

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

    const inventory = await branch_inventory_model.create({
      product: product._id,
      branch,
      stock: stock_management,
      pricing,
    });

    await inventory.populate("product branch");

    return res.status(201).json({ success: true, inventory });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_stock = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_stock, reorder_level, supplier } = req.body;

    const inventory = await branch_inventory_model.findByIdAndUpdate(
      id,
      {
        $set: {
          "stock.current_stock": current_stock,
          "stock.reorder_level": reorder_level,
          "stock.supplier": supplier,
        },
      },
      { new: true },
    );

    if (!inventory)
      return res.status(404).json({ success: false, message: "Not found." });

    return res.status(200).json({ success: true, inventory });
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

    const inventory = await branch_inventory_model.findById(id);
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

    const product = await product_model.findByIdAndUpdate(
      id,
      { $set: req.body },
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

    const inventory = await branch_inventory_model.findById(id);
    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Inventory not found." });

    const existing = await product_model.findOne({
      barcode,
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

    const inventory = await branch_inventory_model.findById(id);
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

    if (!selling_price || !markup_value || !cost_per_unit)
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });

    const inventory = await branch_inventory_model.findByIdAndUpdate(
      id, // ← price is stored on inventory, not product
      {
        $set: {
          "pricing.markup_value": Number(markup_value),
          "pricing.selling_price": Number(selling_price),
          "pricing.cost_per_unit": Number(cost_per_unit),
        },
      },
      { new: true },
    );

    if (!inventory)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    return res.status(200).json({ success: true, inventory });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_supplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier } = req.body;

    const inventory = await branch_inventory_model.findByIdAndUpdate(
      id,
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
    const inventory = await branch_inventory_model.findByIdAndDelete(id);
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
    });
    await branch_inventory_model.deleteMany({ _id: { $in: ids } });

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
    await branch_inventory_model.deleteMany({});
    await product_model.deleteMany({});
    return res
      .status(200)
      .json({ success: true, message: "All products deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
