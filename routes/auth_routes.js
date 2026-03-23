import express from "express";
import {
  register,
  login,
  logout,
  send_verification_otp,
  verify_account,
  is_authenticated,
  send_reset_otp,
  reset_password,
  verify_reset_otp,
} from "../controllers/auth_controller.js";
import { user_auth } from "../middleware/user_auth.js";

const auth_router = express.Router();

auth_router.post("/register", register);
auth_router.post("/login", login);
auth_router.get("/logout", logout);
auth_router.post("/send-verification-otp", user_auth, send_verification_otp);
auth_router.post("/verify-account", user_auth, verify_account);
auth_router.get("/is-auth", user_auth, is_authenticated);
auth_router.post("/send-reset-otp", send_reset_otp);
auth_router.post("/verify-reset-otp", verify_reset_otp);
auth_router.post("/reset-password", reset_password);

export default auth_router;
