import product_model from "../models/product_model.js";
import branch_inventory_model from "../models/branch_inventory_model.js";

export const get_products = async (req, res) => {
  try {
    const { branch_id } = req.query;
    if (branch_id) {
      const inventories = await branch_inventory_model
        .find({
          branch: branch_id,
        })
        .populate("product")
        .populate("branch")
        .sort({ "product.category": 1, "product.name": 1 });

      const products = inventories.map((inventory) => ({
        _id: inventory.id,
        product_id: inventory.product_id,
        barcode: inventory.product.barcode,
        name: inventory.product.name,
        brand: inventory.product.brand,
        category: inventory.product.category,
        unit: inventory.product.unit,
        photo: inventory.product.photo,
        branch: inventory.branch,
        stock_management: inventory.stock,
        pricing: inventory.pricing,
        createdAt: inventory.createdAt,
      }));

      return res.status(200).json({ success: true, products });
    }

    const inventory = await branch_inventory_model
      .find()
      .populate("product")
      .populate("branch")
      .sort({ createdAt: -1 });

    const products = inventory.map((inventory) => ({
      _id: inventory._id,
      product_id: inventory.product._id,
      barcode: inventory.product.barcode,
      name: inventory.product.name,
      brand: inventory.product.brand,
      category: inventory.product.category,
      unit: inventory.product.unit,
      photo: inventory.product.photo,
      branch: inventory.branch,
      stock_management: inventory.stock,
      pricing: inventory.pricing,
      createdAt: inventory.createdAt,
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

    // Find which branches already have this product
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
        message: "This product already exist in this branch",
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
        messsge: "Name and Brand is required.",
      });

    const inventory = await branch_inventory_model.findById(id);
    const product = await product_model.findByIdAndUpdate(
      inventory.product,
      { name: brand },
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
        .json({ sucess: false, message: "Barcode not found." });

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
        .json({ success: false, message: "Category is Required." });

    const product = await product_model.findByIdAndUpdate(
      id,
      {
        $set: { category },
      },
      { new: true, runValidators: true },
    );

    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not Found." });

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
      return res.status(404).json({
        success: false,
        message: "All field is required.",
      });

    const product = await product_model.findByIdAndUpdate(
      id,
      {
        $set: {
          "pricing.markup_value": Number(markup_value),
          "pricing.selling_price": Number(selling_price),
          "pricing.cost_per_unit": Number(cost_per_unit),
        },
      },
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

    return res.status(200).json({ success: true, product });
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

    const remianing = await branch_inventory_model.countDocuments({
      product: inventory.product,
    });

    if (remianing === 0) {
      await product_model.findByIdAndDelete(inventory.product);
    }

    return res
      .status(200)
      .json({ success: true, message: "Product deleted successfully." });
  } catch (error) {
    console.log("Delete error:", error.message);
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
    return res.status(500).json({ success: false, message: error.messsage });
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
