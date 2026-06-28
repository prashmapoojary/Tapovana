const fs = require('fs');
const path = require('path');
const https = require('https');

const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/herrvonmuellerhoff/HerrVonMuellerhoff-Regular.ttf';
const destDir = path.join(__dirname, '../../Tapovana_Frontend/src/assets/fonts');
const destPath = path.join(destDir, 'HerrVonMuellerhoff-Regular.ttf');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

console.log(`Downloading font from ${fontUrl}...`);
const file = fs.createWriteStream(destPath);
https.get(fontUrl, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
            redirectResponse.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Font downloaded successfully to ${destPath}`);
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`Font downloaded successfully to ${destPath}`);
        });
    }
}).on('error', (err) => {
    fs.unlink(destPath, () => {});
    console.error(`Error downloading font: ${err.message}`);
});
