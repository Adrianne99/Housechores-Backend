import express from "express";
import { get_dashboard_stats } from "../controllers/dashboard_controller.js";
import { user_auth } from "../middleware/user_auth.js";
import { require_permission } from "../utils/permissions.js";

const dashboard_router = express.Router();

dashboard_router.use(user_auth);

// Any authenticated user that can ring up sales can see their scoped
// dashboard (admins: org-wide, managers/employees: their branch/own).
dashboard_router.get(
  "/stats",
  require_permission("canCreateOrders"),
  get_dashboard_stats,
);

export default dashboard_router;
