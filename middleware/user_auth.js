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
    // The organization (tenant) every query in this request is scoped to.
    // Root admins own their org (organization === own _id); for legacy data
    // that predates multi-tenancy we fall back to the user's own _id.
    req.org = user.organization || user._id;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Token failed" });
  }
};

export const require_admin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Admins only",
    });
  }
  next();
};

export const require_branch_manager = (req, res, next) => {
  if (!req.user || !["admin", "branch_manager"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden Branch Manager or above only.",
    });
  }
  next();
};

export const require_employee = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "branch_manager", "employee"].includes(req.user.role)
  ) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Employees only",
    });
  }
  next();
};

export const inject_branch_filter = (req, res, next) => {
  const { role, branch } = req.user;

  // Every filter is scoped to the caller's organization first.
  if (["admin"].includes(role)) {
    req.branch_filter = req.query.branch_id
      ? { organization: req.org, branch: req.query.branch_id }
      : { organization: req.org };
  } else if (branch) {
    req.branch_filter = {
      organization: req.org,
      branch: branch._id ?? branch,
    };
  } else {
    return res.status(403).json({
      success: false,
      message:
        "Forbidden: No branch assigned to your account. Contact your admin.",
    });
  }

  next();
};
