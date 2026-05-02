import express from "express";
import {
  user_auth,
  require_admin,
  require_employee,
  require_branch_manager,
} from "../middleware/user_auth.js";
import {
  clock_in,
  clock_out,
  get_my_timelogs,
  get_all_timelogs,
  manual_log,
  update_hourly_rate,
} from "../controllers/timelogs_controller.js";

const timelog_router = express.Router();

timelog_router.post("/clock-in", user_auth, require_branch_manager, clock_in);
timelog_router.post("/clock-out", user_auth, require_branch_manager, clock_out);
timelog_router.get("/my-logs", user_auth, require_employee, get_my_timelogs);
timelog_router.get("/", user_auth, require_branch_manager, get_all_timelogs);
timelog_router.post("/manual", user_auth, require_branch_manager, manual_log);
timelog_router.patch(
  "/hourly-rate/:id",
  user_auth,
  require_admin,
  update_hourly_rate,
);

export default timelog_router;
