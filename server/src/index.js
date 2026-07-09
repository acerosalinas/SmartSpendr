import express from "express";
import cors from "cors";
import "dotenv/config";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import goalsRoutes from "./routes/goals.js";
import dashboardRoutes from "./routes/dashboard.js";
import categoriesRoutes from "./routes/categories.js";
import transactionsRoutes from "./routes/transactions.js";
import budgetsRoutes from "./routes/budgets.js";
import categorySummaryRoutes from "./routes/categorySummary.js";
import debtBillsRoutes from "./routes/debtBills.js";
import monthsRoutes from "./routes/months.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "ok", database: "disconnected", error: err.message });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/category-summary", categorySummaryRoutes);
app.use("/api/debt-bills", debtBillsRoutes);
app.use("/api/months", monthsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Milestone API listening on port ${port}`));
