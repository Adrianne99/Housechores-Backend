import product_model from "../models/product_model.js";

const products_seed_data = [
  {
    barcode: "4800016644721",
    name: "Nissin Cup Noodles Seafood",
    brand: "Nissin",
    category: "Instant Noodles",
    unit: "piece",
    stock_management: {
      current_stock: 24,
      reorder_level: 5,
      supplier: "Puregold",
    },
    pricing: { cost_per_unit: 18.5, markup_value: 3.5, selling_price: 22.0 },
  },
  {
    barcode: "4800016111011",
    name: "Lucky Me! Pancit Canton Original",
    brand: "Lucky Me",
    category: "Instant Noodles",
    unit: "sachet",
    stock_management: { current_stock: 72, reorder_level: 12 },
    pricing: { cost_per_unit: 14.5, markup_value: 2.5, selling_price: 17.0 },
  },
  {
    barcode: "4800016111022",
    name: "Lucky Me! Pancit Canton Kalamansi",
    brand: "Lucky Me",
    category: "Instant Noodles",
    unit: "sachet",
    stock_management: { current_stock: 72, reorder_level: 12 },
    pricing: { cost_per_unit: 14.5, markup_value: 2.5, selling_price: 17.0 },
  },
  {
    barcode: "4800016111033",
    name: "Lucky Me! Pancit Canton Extra Hot",
    brand: "Lucky Me",
    category: "Instant Noodles",
    unit: "sachet",
    stock_management: { current_stock: 72, reorder_level: 12 },
    pricing: { cost_per_unit: 14.5, markup_value: 2.5, selling_price: 17.0 },
  },
  {
    barcode: "4800016111044",
    name: "Lucky Me! Mami Beef",
    brand: "Lucky Me",
    category: "Instant Noodles",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 10 },
    pricing: { cost_per_unit: 10.5, markup_value: 2.5, selling_price: 13.0 },
  },
  {
    barcode: "4800016111055",
    name: "Lucky Me! Mami Chicken",
    brand: "Lucky Me",
    category: "Instant Noodles",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 10 },
    pricing: { cost_per_unit: 10.5, markup_value: 2.5, selling_price: 13.0 },
  },
  {
    barcode: "4806511111011",
    name: "Mega Sardines Red",
    brand: "Mega",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 50, reorder_level: 10 },
    pricing: { cost_per_unit: 21.5, markup_value: 2.5, selling_price: 24.0 },
  },
  {
    barcode: "4806511111022",
    name: "Mega Sardines Green",
    brand: "Mega",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 50, reorder_level: 10 },
    pricing: { cost_per_unit: 21.0, markup_value: 2.0, selling_price: 23.0 },
  },
  {
    barcode: "4800012221011",
    name: "Argentina Corned Beef",
    brand: "Argentina",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 24, reorder_level: 5 },
    pricing: { cost_per_unit: 38.0, markup_value: 4.0, selling_price: 42.0 },
  },
  {
    barcode: "4800012221022",
    name: "Argentina Beef Loaf",
    brand: "Argentina",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 24, reorder_level: 5 },
    pricing: { cost_per_unit: 24.0, markup_value: 3.0, selling_price: 27.0 },
  },
  {
    barcode: "4800012221033",
    name: "555 Sardines in Tomato Sauce",
    brand: "555",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 48, reorder_level: 8 },
    pricing: { cost_per_unit: 21.0, markup_value: 2.5, selling_price: 23.5 },
  },
  {
    barcode: "4800012221044",
    name: "555 Fried Sardines Hot & Spicy",
    brand: "555",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 24, reorder_level: 5 },
    pricing: { cost_per_unit: 22.5, markup_value: 2.5, selling_price: 25.0 },
  },
  {
    barcode: "4800012221055",
    name: "Century Tuna Flakes in Oil",
    brand: "Century",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 24, reorder_level: 5 },
    pricing: { cost_per_unit: 35.5, markup_value: 3.5, selling_price: 39.0 },
  },
  {
    barcode: "4800012221066",
    name: "Century Tuna Hot & Spicy",
    brand: "Century",
    category: "Canned Goods",
    unit: "can",
    stock_management: { current_stock: 24, reorder_level: 5 },
    pricing: { cost_per_unit: 35.5, markup_value: 3.5, selling_price: 39.0 },
  },
  {
    barcode: "4800011111011",
    name: "Nescafe 3-in-1 Original",
    brand: "Nescafe",
    category: "Coffee",
    unit: "sachet",
    stock_management: { current_stock: 120, reorder_level: 20 },
    pricing: { cost_per_unit: 8.5, markup_value: 1.5, selling_price: 10.0 },
  },
  {
    barcode: "4800011111022",
    name: "Nescafe 3-in-1 Brown",
    brand: "Nescafe",
    category: "Coffee",
    unit: "sachet",
    stock_management: { current_stock: 120, reorder_level: 20 },
    pricing: { cost_per_unit: 8.5, markup_value: 1.5, selling_price: 10.0 },
  },
  {
    barcode: "4800011111033",
    name: "Kopiko Black",
    brand: "Kopiko",
    category: "Coffee",
    unit: "sachet",
    stock_management: { current_stock: 120, reorder_level: 20 },
    pricing: { cost_per_unit: 8.0, markup_value: 2.0, selling_price: 10.0 },
  },
  {
    barcode: "4800011111044",
    name: "Kopiko Blanca",
    brand: "Kopiko",
    category: "Coffee",
    unit: "sachet",
    stock_management: { current_stock: 120, reorder_level: 20 },
    pricing: { cost_per_unit: 8.0, markup_value: 2.0, selling_price: 10.0 },
  },
  {
    barcode: "4800011111055",
    name: "Great Taste White",
    brand: "Great Taste",
    category: "Coffee",
    unit: "sachet",
    stock_management: { current_stock: 120, reorder_level: 20 },
    pricing: { cost_per_unit: 8.2, markup_value: 1.8, selling_price: 10.0 },
  },
  {
    barcode: "4800013331011",
    name: "Surf Powder Cherry Blossom",
    brand: "Surf",
    category: "Laundry",
    unit: "sachet",
    stock_management: { current_stock: 60, reorder_level: 10 },
    pricing: { cost_per_unit: 6.25, markup_value: 0.75, selling_price: 7.0 },
  },
  {
    barcode: "4800013331022",
    name: "Ariel Sunrise Fresh",
    brand: "Ariel",
    category: "Laundry",
    unit: "sachet",
    stock_management: { current_stock: 60, reorder_level: 10 },
    pricing: { cost_per_unit: 10.0, markup_value: 2.0, selling_price: 12.0 },
  },
  {
    barcode: "4800013331033",
    name: "Tide Perfect Clean",
    brand: "Tide",
    category: "Laundry",
    unit: "sachet",
    stock_management: { current_stock: 60, reorder_level: 10 },
    pricing: { cost_per_unit: 10.0, markup_value: 2.0, selling_price: 12.0 },
  },
  {
    barcode: "4800013331044",
    name: "Downy Garden Bloom",
    brand: "Downy",
    category: "Laundry",
    unit: "sachet",
    stock_management: { current_stock: 60, reorder_level: 10 },
    pricing: { cost_per_unit: 6.0, markup_value: 1.0, selling_price: 7.0 },
  },
  {
    barcode: "4800013331055",
    name: "Downy Antibac",
    brand: "Downy",
    category: "Laundry",
    unit: "sachet",
    stock_management: { current_stock: 60, reorder_level: 10 },
    pricing: { cost_per_unit: 6.0, markup_value: 1.0, selling_price: 7.0 },
  },
  {
    barcode: "4800014441011",
    name: "Bear Brand Fortified",
    brand: "Bear Brand",
    category: "Milk Powder",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 12 },
    pricing: { cost_per_unit: 14.0, markup_value: 2.0, selling_price: 16.0 },
  },
  {
    barcode: "4800014441022",
    name: "Milo Active-Go",
    brand: "Milo",
    category: "Beverages",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 12 },
    pricing: { cost_per_unit: 11.0, markup_value: 2.0, selling_price: 13.0 },
  },
  {
    barcode: "4800015551011",
    name: "Silver Swan Soy Sauce",
    brand: "Silver Swan",
    category: "Condiments",
    unit: "sachet",
    stock_management: { current_stock: 50, reorder_level: 10 },
    pricing: { cost_per_unit: 4.5, markup_value: 1.5, selling_price: 6.0 },
  },
  {
    barcode: "4800015551022",
    name: "Datu Puti Vinegar",
    brand: "Datu Puti",
    category: "Condiments",
    unit: "sachet",
    stock_management: { current_stock: 50, reorder_level: 10 },
    pricing: { cost_per_unit: 4.5, markup_value: 1.5, selling_price: 6.0 },
  },
  {
    barcode: "4800015551033",
    name: "UFC Catsup",
    brand: "UFC",
    category: "Condiments",
    unit: "sachet",
    stock_management: { current_stock: 50, reorder_level: 10 },
    pricing: { cost_per_unit: 5.0, markup_value: 1.5, selling_price: 6.5 },
  },
  {
    barcode: "4800015551044",
    name: "Magic Sarap",
    brand: "Maggi",
    category: "Condiments",
    unit: "sachet",
    stock_management: { current_stock: 200, reorder_level: 50 },
    pricing: { cost_per_unit: 4.0, markup_value: 1.0, selling_price: 5.0 },
  },
  {
    barcode: "4800016661011",
    name: "Chippy BBQ Large",
    brand: "Jack n Jill",
    category: "Snacks",
    unit: "piece",
    stock_management: { current_stock: 20, reorder_level: 5 },
    pricing: { cost_per_unit: 15.5, markup_value: 2.5, selling_price: 18.0 },
  },
  {
    barcode: "4800016661022",
    name: "Piattos Cheese Large",
    brand: "Jack n Jill",
    category: "Snacks",
    unit: "piece",
    stock_management: { current_stock: 20, reorder_level: 5 },
    pricing: { cost_per_unit: 16.0, markup_value: 3.0, selling_price: 19.0 },
  },
  {
    barcode: "4800016661033",
    name: "Nova Multigrain Large",
    brand: "Jack n Jill",
    category: "Snacks",
    unit: "piece",
    stock_management: { current_stock: 20, reorder_level: 5 },
    pricing: { cost_per_unit: 16.5, markup_value: 3.5, selling_price: 20.0 },
  },
  {
    barcode: "4800016661044",
    name: "Ding Dong Mixed Nuts Small",
    brand: "W.L. Foods",
    category: "Snacks",
    unit: "piece",
    stock_management: { current_stock: 100, reorder_level: 20 },
    pricing: { cost_per_unit: 1.3, markup_value: 0.7, selling_price: 2.0 },
  },
  {
    barcode: "4800016661055",
    name: "Hany Milk Chocolate",
    brand: "Annie's",
    category: "Snacks",
    unit: "piece",
    stock_management: { current_stock: 100, reorder_level: 20 },
    pricing: { cost_per_unit: 1.2, markup_value: 0.8, selling_price: 2.0 },
  },
  {
    barcode: "4800017771011",
    name: "Coke Mismo",
    brand: "Coca-Cola",
    category: "Beverages",
    unit: "bottle",
    stock_management: { current_stock: 24, reorder_level: 6 },
    pricing: { cost_per_unit: 18.0, markup_value: 2.0, selling_price: 20.0 },
  },
  {
    barcode: "4800017771022",
    name: "Royal Orange Mismo",
    brand: "Coca-Cola",
    category: "Beverages",
    unit: "bottle",
    stock_management: { current_stock: 24, reorder_level: 6 },
    pricing: { cost_per_unit: 18.0, markup_value: 2.0, selling_price: 20.0 },
  },
  {
    barcode: "4800017771033",
    name: "Sprite Mismo",
    brand: "Coca-Cola",
    category: "Beverages",
    unit: "bottle",
    stock_management: { current_stock: 24, reorder_level: 6 },
    pricing: { cost_per_unit: 18.0, markup_value: 2.0, selling_price: 20.0 },
  },
  {
    barcode: "4800017771044",
    name: "Nature's Spring Water 500ml",
    brand: "Nature's Spring",
    category: "Beverages",
    unit: "bottle",
    stock_management: { current_stock: 48, reorder_level: 12 },
    pricing: { cost_per_unit: 10.0, markup_value: 3.0, selling_price: 13.0 },
  },
  {
    barcode: "4800017771055",
    name: "C2 Solo Green Tea",
    brand: "Universal Robina",
    category: "Beverages",
    unit: "bottle",
    stock_management: { current_stock: 24, reorder_level: 6 },
    pricing: { cost_per_unit: 14.5, markup_value: 2.5, selling_price: 17.0 },
  },
  {
    barcode: "4800018881011",
    name: "Safeguard White Soap Small",
    brand: "P&G",
    category: "Personal Care",
    unit: "piece",
    stock_management: { current_stock: 12, reorder_level: 3 },
    pricing: { cost_per_unit: 22.0, markup_value: 3.0, selling_price: 25.0 },
  },
  {
    barcode: "4800018881022",
    name: "Sunlight Dishwashing Liquid",
    brand: "Unilever",
    category: "Household",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 10 },
    pricing: { cost_per_unit: 5.5, markup_value: 1.5, selling_price: 7.0 },
  },
  {
    barcode: "4800018881033",
    name: "Joy Dishwashing Sachet",
    brand: "P&G",
    category: "Household",
    unit: "sachet",
    stock_management: { current_stock: 48, reorder_level: 10 },
    pricing: { cost_per_unit: 6.0, markup_value: 1.0, selling_price: 7.0 },
  },
  {
    barcode: "4800018881044",
    name: "Colgate Sachet",
    brand: "Colgate",
    category: "Personal Care",
    unit: "sachet",
    stock_management: { current_stock: 72, reorder_level: 12 },
    pricing: { cost_per_unit: 8.0, markup_value: 2.0, selling_price: 10.0 },
  },
  {
    barcode: "4800018881055",
    name: "Creamsilk Sachet Green",
    brand: "Unilever",
    category: "Personal Care",
    unit: "sachet",
    stock_management: { current_stock: 72, reorder_level: 12 },
    pricing: { cost_per_unit: 6.5, markup_value: 1.5, selling_price: 8.0 },
  },
  {
    barcode: "4800019991011",
    name: "Egg (Large)",
    brand: "Local Farm",
    category: "Fresh",
    unit: "piece",
    stock_management: { current_stock: 60, reorder_level: 15 },
    pricing: { cost_per_unit: 7.5, markup_value: 1.5, selling_price: 9.0 },
  },
  {
    barcode: "4800019991022",
    name: "White Bread (Gardenia)",
    brand: "Gardenia",
    category: "Bakery",
    unit: "loaf",
    stock_management: { current_stock: 5, reorder_level: 2 },
    pricing: { cost_per_unit: 65.0, markup_value: 5.0, selling_price: 70.0 },
  },
  {
    barcode: "4800019991033",
    name: "Sugar Brown 1/4kg",
    brand: "Local",
    category: "Pantry",
    unit: "pack",
    stock_management: { current_stock: 20, reorder_level: 5 },
    pricing: { cost_per_unit: 22.0, markup_value: 3.0, selling_price: 25.0 },
  },
  {
    barcode: "4800019991044",
    name: "Cooking Oil Sachet",
    brand: "Local",
    category: "Pantry",
    unit: "sachet",
    stock_management: { current_stock: 40, reorder_level: 10 },
    pricing: { cost_per_unit: 10.0, markup_value: 2.0, selling_price: 12.0 },
  },
  {
    barcode: "4800019991055",
    name: "Pandesal (Pack of 10)",
    brand: "Local Bakery",
    category: "Bakery",
    unit: "pack",
    stock_management: { current_stock: 10, reorder_level: 3 },
    pricing: { cost_per_unit: 20.0, markup_value: 5.0, selling_price: 25.0 },
  },
];

export const seed_products = async (req, res) => {
  try {
    const result = await product_model.insertMany(products_seed_data, {
      ordered: false,
    });

    return res.status(201).json({
      success: true,
      message: `${result.length} products inserted succesfully.`,
    });
  } catch (error) {
    if (error.code === 11000) {
      const inserted = error.result?.nInserted ?? 0;
      return res.status(200).json({
        success: true,
        message: `Seed Complete. ${inserted} new products inserted, duplicates skipped.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const create_product = async (req, res) => {
  try {
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

    const isProductExisting = await product_model.findOne({ barcode });
    if (isProductExisting)
      return res.status(409).json({
        success: false,
        message: "Product with this barcode already exists.",
      });

    const product = await product_model.create(req.body);
    return res
      .status(201)
      .json({ success: true, message: "Product Created", product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_products = async (req, res) => {
  try {
    const products = await product_model.find().sort({ category: 1, name: 1 });
    return res.status(200).json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
