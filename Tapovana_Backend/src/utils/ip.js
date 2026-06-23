const os = require('os');

const getLocalIpAddress = () => {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch (e) {
        console.error('Error getting local IP:', e.message);
    }
    return 'localhost';
};

module.exports = { getLocalIpAddress };
