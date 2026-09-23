import express from "express";
import {
  create_order,
  get_orders,
  get_order_by_id,
  void_order,
} from "../controllers/order_controller.js";
import { user_auth } from "../middleware/user_auth.js";
import { require_permission } from "../utils/permissions.js";

const order_router = express.Router();

order_router.use(user_auth);

order_router.get("/", require_permission("canCreateOrders"), get_orders);
order_router.post("/", require_permission("canCreateOrders"), create_order);
order_router.get(
  "/:id",
  require_permission("canCreateOrders"),
  get_order_by_id,
);
order_router.patch(
  "/:id/void",
  require_permission("canCreateOrders"),
  void_order,
);

export default order_router;
