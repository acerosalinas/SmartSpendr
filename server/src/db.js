import pg from "pg";
import "dotenv/config";

// Restore mysql2's `decimalNumbers: true, dateStrings: true` behavior:
// numeric -> JS number, date/timestamp -> raw string (no JS Date/timezone conversion).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (v) => v);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// mysql2-compatible query interface: `?` placeholders in, `[rows]` array out.
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const rawQuery = pool.query.bind(pool);
pool.query = async (sql, params = []) => {
  const result = await rawQuery(toPgSql(sql), params);
  return [result.rows];
};

// mysql2-compatible transaction interface (getConnection/beginTransaction/commit/rollback/release).
pool.getConnection = async () => {
  const client = await pool.connect();
  return {
    query: async (sql, params = []) => {
      const result = await client.query(toPgSql(sql), params);
      return [result.rows];
    },
    beginTransaction: () => client.query("BEGIN"),
    commit: () => client.query("COMMIT"),
    rollback: () => client.query("ROLLBACK"),
    release: () => client.release(),
  };
};
