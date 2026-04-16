import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./product_model.js";
dotenv.config();

const dummyProducts = [
  {
    barcode: "4800016644801",
    name: "Lucky Me! Instant Noodles Beef",
    brand: "Monde Nissin",
    category: "Instant Noodles",
    unit: "Pack",
    stock_management: {
      current_stock: 150,
      reorder_level: 50,
      supplier: "Monde Nissin Corp",
    },
    pricing: { cost_per_unit: 10.5, markup_value: 2.5, selling_price: 13.0 },
  },
  {
    barcode: "4800011112223",
    name: "Silver Swan Soy Sauce",
    brand: "Silver Swan",
    category: "Condiments",
    unit: "Bottle (385ml)",
    stock_management: {
      current_stock: 45,
      reorder_level: 20,
      supplier: "NutriAsia",
    },
    pricing: { cost_per_unit: 18.0, markup_value: 4.0, selling_price: 22.0 },
  },
  {
    barcode: "4808647021305",
    name: "San Miguel Pale Pilsen",
    brand: "San Miguel",
    category: "Beverages",
    unit: "Can (330ml)",
    stock_management: {
      current_stock: 12,
      reorder_level: 24,
      supplier: "SMC Brewery",
    },
    pricing: { cost_per_unit: 45.0, markup_value: 10.0, selling_price: 55.0 },
  },
  {
    barcode: "4800011565431",
    name: "Datu Puti Vinegar",
    brand: "Datu Puti",
    category: "Condiments",
    unit: "Pouch (200ml)",
    stock_management: {
      current_stock: 80,
      reorder_level: 30,
      supplier: "NutriAsia",
    },
    pricing: { cost_per_unit: 8.5, markup_value: 2.5, selling_price: 11.0 },
  },
  {
    barcode: "4806518334455",
    name: "Fita Crackers",
    brand: "M.Y. San",
    category: "Snacks",
    unit: "Roll",
    stock_management: {
      current_stock: 200,
      reorder_level: 40,
      supplier: "Monde M.Y. San",
    },
    pricing: { cost_per_unit: 5.2, markup_value: 1.8, selling_price: 7.0 },
  },
];

const seedDatabase = async () => {
  try {
    // 1. Connect to DB (Replace with your actual Connection String or process.env.MONGO_URI)
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB...");

    // 2. Clear existing data so you don't get 'duplicate barcode' errors
    await Product.deleteMany({});
    console.log("Old products cleared.");

    // 3. Insert the dummy data
    await Product.insertMany(dummyProducts);
    console.log(`${dummyProducts.length} Philippine Grocery items added!`);

    // 4. Close connection
    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
