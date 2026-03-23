export const get_user_data = async (req, res) => {
  try {
    const user = req.user; // ✅ already fetched by middleware

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      userData: {
        name: user.name,
        role: user.role,
        is_account_verified: user.is_account_verified,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
