import express from "express";
import { user_auth } from "../middleware/user_auth.js";
import { get_user_data } from "../controllers/user_controller.js";

const user_router = express.Router();

user_router.get("/data", user_auth, get_user_data);

export default user_router;
