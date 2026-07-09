import { Router } from "express";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

export const CATEGORY_TYPES = ["expense", "income", "savings", "debt", "bill"];

router.get("/", asyncHandler(async (req, res) => {
  const { type } = req.query;
  const params = [req.user.id];
  let sql = "SELECT * FROM categories WHERE user_id = ?";
  if (type) {
    if (!CATEGORY_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid category type" });
    }
    sql += " AND type = ?";
    params.push(type);
  }
  sql += " ORDER BY name ASC";
  const [rows] = await pool.query(sql, params);
  res.json({ categories: rows });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Category name is required" });
  if (!CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({ error: "Invalid category type" });
  }

  const id = crypto.randomUUID();
  try {
    await pool.query("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)", [
      id,
      req.user.id,
      name.trim(),
      type,
    ]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A category with this name already exists" });
    }
    throw err;
  }

  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [id]);
  res.status(201).json({ category: rows[0] });
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Category name is required" });
  if (!CATEGORY_TYPES.includes(type)) {
    return res.status(400).json({ error: "Invalid category type" });
  }

  const [existing] = await pool.query("SELECT id FROM categories WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Category not found" });

  try {
    await pool.query("UPDATE categories SET name = ?, type = ? WHERE id = ?", [
      name.trim(),
      type,
      req.params.id,
    ]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A category with this name already exists" });
    }
    throw err;
  }

  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [req.params.id]);
  res.json({ category: rows[0] });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const [existing] = await pool.query("SELECT id FROM categories WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (!existing[0]) return res.status(404).json({ error: "Category not found" });

  try {
    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
      return res.status(409).json({
        error: "This category is used by existing entries and can't be deleted",
      });
    }
    throw err;
  }

  res.json({ message: "Category deleted" });
}));

export default router;
