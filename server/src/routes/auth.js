import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ALLOWED_THEMES = [
  "blue-white",
  "blue-black",
  "pink-white",
  "pink-black",
  "emerald-white",
  "violet-white",
];

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function toPublicUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    theme: row.theme || "blue-white",
    created_at: row.created_at,
  };
}

router.post("/register", asyncHandler(async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Full name, email, and password are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (id, full_name, email, password_hash) VALUES (?, ?, ?, ?)",
    [id, full_name.trim(), email.trim().toLowerCase(), passwordHash]
  );

  res.status(201).json({ message: "Account created" });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: toPublicUser(user) });
}));

router.put("/profile", requireAuth, asyncHandler(async (req, res) => {
  const { full_name, email } = req.body;
  if (!full_name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Full name and email are required" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [
    normalizedEmail,
    req.user.id,
  ]);
  if (existing.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  await pool.query("UPDATE users SET full_name = ?, email = ? WHERE id = ?", [
    full_name.trim(),
    normalizedEmail,
    req.user.id,
  ]);

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  res.json({ user: toPublicUser(rows[0]) });
}));

router.put("/password", requireAuth, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  const user = rows[0];
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, req.user.id]);
  res.json({ message: "Password updated" });
}));

router.put("/theme", requireAuth, asyncHandler(async (req, res) => {
  const { theme } = req.body;
  if (!ALLOWED_THEMES.includes(theme)) {
    return res.status(400).json({ error: "Invalid theme" });
  }

  await pool.query("UPDATE users SET theme = ? WHERE id = ?", [theme, req.user.id]);
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
  res.json({ user: toPublicUser(rows[0]) });
}));

export default router;
