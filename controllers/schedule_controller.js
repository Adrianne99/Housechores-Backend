import shift_model from "../models/shift_model.js";
import timelog_model from "../models/timelog_model.js";
import user_model from "../models/user_model.js";

export const get_shift = async (req, res) => {
  try {
    const { start, end, date } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (start && end) filter.date = { $gte: start, $lte: end };
    if (req.user.role === "branch_manager") {
      filter.branch = req.user.branch?._id ?? req.user.branch;
    }
    const shifts = await shift_model
      .find(filter)
      .populate("employee", "name role hourly_rate")
      .populate("branch", "name")
      .sort({ start_time: 1 });
    return res.json({ success: true, shifts });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const create_shift = async (req, res) => {
  try {
    const { employee, branch, date, start_time, end_time } = req.body;

    if (!employee || !branch || !date || !start_time || !end_time) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const { id } = req.params;

    const [startHour, startMinute] = start_time.split(":").map(Number);
    const [endHour, endMinute] = end_time.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let diffMinutes = endTotalMinutes - startTotalMinutes;

    if (diffMinutes < 0) {
      diffMinutes += 1440;
    }

    const hours = diffMinutes / 60;

    if (hours === 0) {
      return res.status(400).json({
        success: false,
        message: "End time cannot be the same as start time.",
      });
    }
    const existing_shift = await shift_model.findOne({ employee, date });
    if (existing_shift)
      return res.status(409).json({
        success: false,
        message: "Employee already has a shift on this day.",
      });

    const shift = await shift_model.create({
      employee,
      branch,
      date,
      start_time,
      end_time,
      hours,
      created_by: req.user._id,
    });

    await shift.populate("employee", "name role hourly_rate");
    await shift.populate("branch", "name");

    return res.status(201).json({ success: true, shift });
  } catch (error) {
    return res.statu(500).json({ success: false, message: error.message });
  }
};

export const update_shift = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body;

    const [startHour, startMinute] = start_time.split(":").map(Number);
    const [endHour, endMinute] = end_time.split(":").map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    let durationMinutes = endTotalMinutes - startTotalMinutes;

    if (durationMinutes < 0) {
      durationMinutes += 1440;
    }

    const hours = durationMinutes / 60;

    if (hours === 0) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time.",
      });
    }

    const shift = await shift_model
      .findByIdAndUpdate(id, { start_time, end_time, hours }, { new: true })
      .populate("employee", "name role hourly_rate")
      .populate("branch", "name");

    if (!shift)
      return res
        .status(404)
        .json({ success: false, message: "Shift not found." });

    return res.json({ success: true, shift });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const delete_shift = async (req, res) => {
  try {
    const shift = await shift_model.findByIdAndDelete(req.params.id);
    if (!shift)
      return res
        .status(404)
        .json({ success: false, message: "Shift not found." });
    return res.json({ success: true, message: "Shift deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
