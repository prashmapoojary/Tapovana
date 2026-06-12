async function run() {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}
run();
