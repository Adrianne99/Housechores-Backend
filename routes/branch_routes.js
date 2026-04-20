import express from "express";
import { user_auth, require_admin } from "../middleware/user_auth.js";
import {
  create_branch,
  get_branch,
  delete_branch,
} from "../controllers/branch_controller.js";

const branch_router = express.Router();

branch_router.get("/", user_auth, require_admin, get_branch);
branch_router.post("", user_auth, require_admin, create_branch);
branch_router.delete("/:id", user_auth, require_admin, delete_branch);

export default branch_router;
