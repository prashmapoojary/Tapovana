const { query } = require("./src/config/db");

async function check() {
  try {
    const res = await query("SELECT * FROM login_credentials");
    console.log("Login credentials:", res.rows);
  } catch (err) {
    console.error("DB Error (login_credentials):", err.message);
  }

  try {
    const res = await query("SELECT * FROM team_members");
    console.log("Team members:", res.rows);
  } catch (err) {
    console.error("DB Error (team_members):", err.message);
  }
}

check();
