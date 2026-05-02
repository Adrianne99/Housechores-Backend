import express from "express";
import { require_admin, user_auth } from "../middleware/user_auth.js";
import {
  create_staff,
  delete_staff,
  get_all_staff,
  get_user_data,
  update_staff,
} from "../controllers/user_controller.js";

const user_router = express.Router();

user_router.get("/data", user_auth, get_user_data);

user_router.get("/staff", user_auth, require_admin, get_all_staff);
user_router.post("/staff", user_auth, require_admin, create_staff);
user_router.put("/staff/:id", user_auth, require_admin, update_staff);
user_router.delete("/staff/:id", user_auth, require_admin, delete_staff);

export default user_router;
