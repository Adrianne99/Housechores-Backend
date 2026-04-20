import branch_model from "../models/branches_model.js";

export const get_branch = async (req, res) => {
  try {
    const branches = await branch_model.find({ is_active: true });
    return res.status(200).json({ success: true, branches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const create_branch = async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Branch name is required." });

    const branch = await branch_model.create({ name, address });
    return res.status(200).json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_branch = async (req, res) => {
  try {
    const branch = await branch_model.findByIdAndDelete(req.params.id);

    if (!branch)
      return res
        .status(404)
        .json({ success: false, message: "Branch not found." });
    return res.status(200).json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
