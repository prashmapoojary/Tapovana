async function checkRemoteEnrollments() {
  try {
    const res = await fetch('https://tapoclg.onrender.com/api/workshops/enroll');
    if (res.ok) {
      const data = await res.json();
      console.log("Remote Enrollments:", JSON.stringify(data, null, 2));
    } else {
      console.log("HTTP Error:", res.status);
    }
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}
checkRemoteEnrollments();
