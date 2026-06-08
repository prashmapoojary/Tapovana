const { query } = require('./src/config/db');

async function test() {
    try {
        const result = await query(`
            SELECT s.id, s.name, 
            (
                SELECT COALESCE(json_agg(json_build_object(
                    'id', st.id, 
                    'name', st.first_name || ' ' || st.last_name, 
                    'email', st.email
                )), '[]'::json)
                FROM team_members st 
                WHERE st.id IN (SELECT jsonb_array_elements_text(COALESCE(s.assigned_staff_ids, '[]'::jsonb))::uuid)
            ) AS assigned_staff_details
            FROM services s 
            LIMIT 5
        `);
        console.log("Success:", JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}
test();
