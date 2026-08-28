const { query } = require('../src/config/db');

async function checkTable() {
  try {
    const colsRes = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    console.log("Transactions Columns:", colsRes.rows);

    const constraintsRes = await query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'transactions'::regclass
    `);
    console.log("Transactions Constraints:", constraintsRes.rows);
  } catch (err) {
    console.error("Error checking table:", err.message);
  }
  process.exit(0);
}

checkTable();
