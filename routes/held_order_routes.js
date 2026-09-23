import express from "express";
import {
  get_held_orders,
  hold_order,
  resume_held_order,
  delete_held_order,
} from "../controllers/held_order_controller.js";
import { user_auth } from "../middleware/user_auth.js";
import { require_permission } from "../utils/permissions.js";

const held_order_router = express.Router();

held_order_router.use(user_auth);

held_order_router.get(
  "/",
  require_permission("canHoldOrders"),
  get_held_orders,
);
held_order_router.post("/", require_permission("canHoldOrders"), hold_order);
held_order_router.get(
  "/:id",
  require_permission("canHoldOrders"),
  resume_held_order,
);
held_order_router.delete(
  "/:id",
  require_permission("canHoldOrders"),
  delete_held_order,
);

export default held_order_router;
