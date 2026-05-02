import shift_model from "../models/shift_model.js";
import timelog_model from "../models/timelog_model.js";
import user_model from "../models/user_model.js";

export const clock_in = async (req, res) => {
  try {
    const employee = req.user._id;
    const branch = req.user.branch;
    const today = new Date().toISOString().split("T")[0];

    const existing_shift = await timelog_model.findOne({
      employee,
      date: today,
      clock_out: null,
    });

    if (existing_shift)
      return res
        .status(409)
        .json({ success: false, message: "Already clocked in." });

    const log = await timelog_model.create({
      employee,
      branch,
      clock_in: new Date(),
      date: today,
      hourly_rate: req.user.hourly_rate ?? 0,
    });
    return res.status(201).json({ success: true, log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clock_out = async (req, res) => {
  try {
    const employee = req.user._id;
    const today = new Date().toISOString().split("T")[0];

    const log = await timelog_model.findOne({
      employee,
      date: today,
      clock_out: null,
    });
    if (!log)
      return res
        .status(404)
        .json({ success: false, message: "No active clock-in found." });

    const clock_out_time = new Date();

    const hours_worked = (clock_out_time - log.clock_in) / (1000 * 60 * 60);
    const computed_salary = parseFloat(
      (hours_worked * log.hourly_rate).toFixed(2),
    );

    log.clock_out = clock_out_time;
    log.hours_worked = parseFloat(hours_worked.toFixed(2));
    log.computed_salary = computed_salary;
    await log.save();

    return res.json({ success: true, log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_my_timelogs = async (req, res) => {
  try {
    const logs = await timelog_model
      .find({ employee: req.user._id })
      .sort({ createdAt: -1 });
    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_all_timelogs = async (req, res) => {
  try {
    const { date, employee_id } = req.query;

    const filter = {};

    if (date) filter.date = date;
    if (employee_id) filter.employee = employee_id;

    const logs = await timelog_model
      .find(filter)
      .populate("employee", "name role hourly_rate")
      .populate("branch", "name")
      .sort({ createdAt: -1 });

    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const manual_log = async (req, res) => {
  try {
    const { employee, date, clock_in, clock_out, notes } = req.body;

    const specific_employee = await user_model.findById(employee);

    if (!specific_employee)
      return res
        .status(404)
        .json({ success: false, message: "Employee not found." });

    const clock_in_time = new Date(clock_in);
    const clock_out_time = new Date(clock_out);

    const hours_worked = parseFloat(
      ((clock_out_time - clock_in_time) / (1000 * 60 * 60)).toFixed(2),
    );

    const computed_salary = parseFloat(
      (hours_worked * (specific_employee.hourly_rate ?? 0)).toFixed(2),
    );
    const log = await timelog_model.create({
      employee,
      branch: emp.branch,
      clock_in: clock_in_time,
      clock_out: clock_out_time,
      hours_worked,
      hourly_rate: emp.hourly_rate ?? 0,
      computed_salary,
      date,
      is_manual: true,
      notes,
    });

    await log.populate("employee", "name role hourly_rate");
    return res.status(201).json({ success: true, log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const update_hourly_rate = async (req, res) => {
  try {
    const { id } = req.params;
    const { hourly_rate } = req.body;

    const user = await user_model
      .findByIdAndUpdate(
        id,
        { hourly_rate: Number(hourly_rate) },
        { new: true },
      )
      .select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
