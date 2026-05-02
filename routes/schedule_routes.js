import express from "express";
import { user_auth, require_admin } from "../middleware/user_auth.js";
import {
  get_shift,
  create_shift,
  update_shift,
  delete_shift,
} from "../controllers/schedule_controller.js";

const schedule_router = express.Router();

schedule_router.get("/", user_auth, require_admin, get_shift);
schedule_router.post("/", user_auth, require_admin, create_shift);
schedule_router.put("/:id", user_auth, require_admin, update_shift);
schedule_router.delete("/:id", user_auth, require_admin, delete_shift);

export default schedule_router;
