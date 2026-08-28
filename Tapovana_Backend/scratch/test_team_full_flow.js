const { query } = require('../src/config/db');
const teamController = require('../src/controllers/teamController');

async function testTeamFlow() {
  console.log("🧪 Testing Team Members API Flow...");

  // 1. Get Team Members
  const fakeReqGet = {
    query: { page: '1', limit: '50' },
    user: { id: "00000000-0000-0000-0000-000000000000", role: "SUPER_ADMIN" }
  };
  const fakeResGet = {
    status: (code) => ({ json: (d) => console.log("   Get Team Status:", code, "Count:", d.users?.length || d.team?.length) }),
    json: (d) => console.log("   Get Team Response Count:", d.users?.length || d.team?.length)
  };
  await teamController.getTeamFrontend(fakeReqGet, fakeResGet);

  // 2. Add Team Member
  console.log("\n2️⃣ Testing Add Team Member...");
  const testEmail = `test.staff.${Date.now()}@tapovana.com`;
  let newMemberId = null;
  const fakeReqAdd = {
    body: {
      first_name: "TestStaff",
      last_name: "User",
      email: testEmail,
      phone: "+91 9876543210",
      role: "THERAPIST",
      specialization: "Abhyanga Therapy",
      send_invite_email: false
    },
    user: { id: "00000000-0000-0000-0000-000000000000", role: "SUPER_ADMIN" }
  };
  const fakeResAdd = {
    status: (code) => {
      console.log("   Add Member Status:", code);
      return { json: (d) => { console.log("   Add Member Response:", d); if (d.user_id) newMemberId = d.user_id; } };
    },
    json: (d) => { console.log("   Add Member Response:", d); if (d.user_id) newMemberId = d.user_id; }
  };
  await teamController.addTeamMemberFrontend(fakeReqAdd, fakeResAdd);

  if (!newMemberId) {
    console.error("❌ Add team member failed.");
    process.exit(1);
  }

  console.log(`\n✅ Team Member Created (ID: ${newMemberId})`);

  // 3. Delete Team Member
  console.log(`\n3️⃣ Testing Delete Team Member (ID: ${newMemberId})...`);
  const fakeReqDelete = {
    params: { id: newMemberId },
    user: { id: "00000000-0000-0000-0000-000000000000", role: "SUPER_ADMIN" }
  };
  const fakeResDelete = {
    status: (code) => {
      console.log("   Delete Member Status:", code);
      return { json: (d) => console.log("   Delete Member Response:", d) };
    },
    json: (d) => console.log("   Delete Member Response:", d)
  };
  await teamController.deleteTeamMemberFrontend(fakeReqDelete, fakeResDelete);

  // Check DB directly
  const dbCheck = await query("SELECT * FROM team_members WHERE id = $1", [newMemberId]);
  console.log("   DB verification after delete:", dbCheck.rows.length === 0 ? "DELETED FROM DB ✅" : "STILL EXISTS ❌");

  process.exit(0);
}

testTeamFlow().catch(err => {
  console.error("❌ Team test error:", err);
  process.exit(1);
});
