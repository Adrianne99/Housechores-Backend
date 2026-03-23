import jwt from "jsonwebtoken";
import User from "../models/user_model.js";

export const user_auth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token failed" });
  }
};

export const require_admin = (req, res, next) => {
  // ✅ Fix 2: was `req.user_role`, should be `req.user.role`
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admins only",
    });
  }
  next();
};

export const require_employee = (req, res, next) => {
  // ✅ Fix 2 (same): was `req.user_role`, should be `req.user.role`
  if (!req.user || req.user.role !== "employee") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Employees only",
    });
  }
  next();
};
