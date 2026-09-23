import express from "express";
import {
  get_all_staff,
  create_staff,
  update_staff,
  deactivate_staff,
  reactivate_staff,
  delete_staff,
} from "../controllers/staff_controller.js";
import { user_auth } from "../middleware/user_auth.js";
import { require_permission } from "../utils/permissions.js";

const staff_router = express.Router();

staff_router.use(user_auth);

staff_router.get("/", require_permission("canManageStaff"), get_all_staff);
staff_router.post("/", require_permission("canManageStaff"), create_staff);
staff_router.put("/:id", require_permission("canManageStaff"), update_staff);
staff_router.patch(
  "/:id/deactivate",
  require_permission("canManageStaff"),
  deactivate_staff,
);
staff_router.patch(
  "/:id/reactivate",
  require_permission("canManageStaff"),
  reactivate_staff,
);
staff_router.delete("/:id", require_permission("canDeleteStaff"), delete_staff);

export default staff_router;
