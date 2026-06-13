async function run() {
    const urls = [
        'https://tapoclg.onrender.com/api/bookings?limit=5',
        'https://tapoclg.onrender.com/api/membership',
        'https://tapovana-backend.onrender.com/api/bookings?limit=5',
        'https://tapovana-backend.onrender.com/api/membership'
    ];

    for (const url of urls) {
        console.log(`\n=================== Fetching: ${url} ===================`);
        try {
            const res = await fetch(url);
            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`Success: ${data.success}`);
                if (data.bookings && data.bookings.length > 0) {
                    console.log("Sample Booking:", JSON.stringify(data.bookings[0], null, 2));
                } else if (data.memberships && data.memberships.length > 0) {
                    console.log("Sample Membership:", JSON.stringify(data.memberships[0], null, 2));
                } else if (Array.isArray(data) && data.length > 0) {
                    console.log("Sample Array Item:", JSON.stringify(data[0], null, 2));
                } else {
                    console.log("Data keys:", Object.keys(data));
                    console.log("Data snippet:", JSON.stringify(data).substring(0, 300));
                }
            } else {
                const text = await res.text();
                console.log("Response text snippet:", text.substring(0, 300));
            }
        } catch (err) {
            console.error(`Error fetching ${url}:`, err.message);
        }
    }
}
run();
