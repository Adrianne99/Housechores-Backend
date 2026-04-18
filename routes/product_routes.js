import express from "express";
import { user_auth, require_admin } from "../middleware/user_auth.js";
import {
  seed_products,
  get_products,
  create_product,
  update_products,
  update_barcode,
  update_category,
  update_stock_management,
  update_name,
  update_price,
  update_supplier,
  delete_product,
} from "../controllers/product_controller.js";

const product_router = express.Router();

product_router.post("/seed", user_auth, require_admin, seed_products);

product_router.get("/", user_auth, get_products);

product_router.post(
  "/create-product",
  user_auth,
  require_admin,
  create_product,
);

product_router.patch("/:id/name", user_auth, require_admin, update_name);

product_router.patch(
  "/:id/stock",
  user_auth,
  require_admin,
  update_stock_management,
);

product_router.patch("/:id/barcode", user_auth, require_admin, update_barcode);
product_router.patch(
  "/:id/category",
  user_auth,
  require_admin,
  update_category,
);

product_router.patch("/:id/price", user_auth, require_admin, update_price);

product_router.patch(
  "/:id/supplier",
  user_auth,
  require_admin,
  update_supplier,
);

product_router.delete("/:id", user_auth, require_admin, delete_product);

export default product_router;
