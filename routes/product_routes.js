import express from "express";
import {
  user_auth,
  require_branch_manager,
  require_employee,
  inject_branch_filter,
  require_admin,
} from "../middleware/user_auth.js";
import {
  get_products,
  create_product,
  update_products,
  update_barcode,
  update_category,
  update_name,
  update_price,
  update_supplier,
  delete_product,
  delete_all,
  delete_bulk,
  update_stock,
  get_product_by_barcode,
} from "../controllers/product_controller.js";

const product_router = express.Router();

// All roles can read — scoped by inject_branch_filter
product_router.get("/", user_auth, inject_branch_filter, get_products);
product_router.get(
  "/barcode/:barcode",
  user_auth,
  require_employee,
  get_product_by_barcode,
);

// Owner/admin only
product_router.post(
  "/create-product",
  user_auth,
  require_admin,
  create_product,
);

// Branch manager and above — prices, stock, supplier, barcode
product_router.patch("/:id/name", user_auth, require_admin, update_name);
product_router.patch(
  "/:id/barcode",
  user_auth,
  require_branch_manager,
  update_barcode,
);
product_router.patch(
  "/:id/stock",
  user_auth,
  require_branch_manager,
  update_stock,
);
product_router.patch(
  "/:id/category",
  user_auth,
  require_admin,
  update_category,
);
product_router.patch(
  "/:id/price",
  user_auth,
  require_branch_manager,
  update_price,
);
product_router.patch(
  "/:id/supplier",
  user_auth,
  require_branch_manager,
  update_supplier,
);

// Owner/admin only
product_router.delete("/bulk", user_auth, require_admin, delete_bulk);
product_router.delete("/all", user_auth, require_admin, delete_all);
product_router.delete("/:id", user_auth, require_admin, delete_product);

export default product_router;
