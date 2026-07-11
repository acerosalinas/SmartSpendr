import crypto from "node:crypto";
import { pool } from "../db.js";

// Registers a month in the `months` table the first time it's referenced,
// so it shows up in the month switcher even before an explicit "add month" action.
export async function ensureMonthExists(userId, month) {
  await pool.query(
    "INSERT INTO months (id, user_id, month) VALUES (?, ?, ?) ON CONFLICT (user_id, month) DO NOTHING",
    [crypto.randomUUID(), userId, month]
  );
}
