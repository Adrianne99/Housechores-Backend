import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import user_model from "../models/user_model.js";
import transporter from "../config/nodemailer.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // ✅ Validate input
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  try {
    const existingUser = await user_model.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Email is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const newUser = new user_model({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newUser.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Housechores App",
      text: `Hello ${name},\n\nWelcome to Housechores! We're excited to have you on board.\n\nBest regards,\nHousechores Team`,
    };

    transporter.sendMail(mailOptions).catch((err) => {
      console.error("Email sending failed:", err.message);
    });

    return res.status(201).json({
      success: true,
      userData: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_account_verified: newUser.is_account_verified,
      },
      message: "Registration successful.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration.",
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required." });

  try {
    const user = await user_model.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });

    // ✅ Include id and role in token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      userData: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_account_verified: user.is_account_verified,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const send_verification_otp = async (req, res) => {
  try {
    const user_id = req.user_id;

    const user = await user_model.findById(user_id);
    console.log(user);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.is_account_verified) {
      return res.json({ success: false, message: "Account already verified" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verify_otp = otp;
    user.verify_otp_expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    const mail_option = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Housechores Account Verification OTP",
      text: `Hello ${user.email},\n\nWelcome to Housechores! Your OTP is ${otp}. \n\nBest regards,\nHousechores Team`,
    };

    await transporter.sendMail(mail_option);

    return res.json({
      success: true,
      message: "OTP sent to your email address",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const verify_account = async (req, res) => {
  const { otp } = req.body;

  const user_id = req.user_id;

  try {
    const user_data = await user_model.findById(user_id);
    console.log(user_data);

    if (!user_data) {
      return res.json({ success: false, message: "User not Found" });
    }

    if (user_data.verify_otp === "" || user_data.verify_otp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user_data.verify_otp_expiry < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }

    user_data.is_account_verified = true;
    user_data.verify_otp = "";
    user_data.verify_otp_expiry = 0;
    await user_data.save();

    return res.json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const is_authenticated = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const send_reset_otp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    const user = await user_model.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.reset_otp = otp;
    user.reset_otp_expiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    const mail_option = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Housechores Password Reset OTP",
      text: `Hello ${user.email},\n\nYour password reset OTP is ${otp}. It is valid for 15 minutes.\n\nBest regards,\nHousechores Team`,
    };

    await transporter.sendMail(mail_option);

    return res.json({
      success: true,
      message: "Password reset OTP sent to your email address",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const verify_reset_otp = async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    return res.json({ success: false, message: "OTP is required" });
  }

  try {
    const user = await user_model.findOne({ reset_otp: otp });

    if (!user) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.reset_otp_expiry < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    return res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const reset_password = async (req, res) => {
  const { email, otp, new_password } = req.body;

  if (!email || !otp || !new_password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  if (new_password.length < 8) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters long.",
    });
  }

  try {
    const user = await user_model.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.reset_otp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.reset_otp_expiry < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }

    const isSamePassword = await bcrypt.compare(new_password, user.password);

    if (isSamePassword) {
      return res.json({
        success: false,
        message: "New password cannot be the same as the old password",
      });
    }

    const hashed_password = await bcrypt.hash(new_password, 8);
    user.password = hashed_password;
    user.reset_otp = "";
    user.reset_otp_expiry = 0;

    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
