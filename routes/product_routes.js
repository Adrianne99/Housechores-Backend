import express from "express";
import { user_auth, require_admin } from "../middleware/user_auth.js";
import {
  seed_products,
  get_products,
  create_product,
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

export default product_router;
