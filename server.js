import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import connectDb from "./config/mongodb.js";
import auth_router from "./routes/auth_routes.js";
import user_router from "./routes/user_routes.js";
import product_router from "./routes/product_routes.js";
import branch_router from "./routes/branch_routes.js";
import schedule_router from "./routes/schedule_routes.js";
import timelogs_router from "./routes/timelog_routes.js";
import staff_router from "./routes/staff_routes.js";
import order_router from "./routes/order_routes.js";
import held_order_router from "./routes/held_order_routes.js";
import dashboard_router from "./routes/dashboard_routes.js";

const app = express();
const PORT = process.env.PORT || 4000;
connectDb();

const allowedOrigins = ["http://localhost:5173"];

app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/branches", branch_router);
app.use("/api/auth", auth_router);
app.use("/api/user", user_router);
app.use("/api/products", product_router);
app.use("/api/schedule", schedule_router);
app.use("/api/timelog", timelogs_router);
app.use("/api/staff", staff_router);
app.use("/api/orders", order_router);
app.use("/api/held-orders", held_order_router);
app.use("/api/dashboard", dashboard_router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
