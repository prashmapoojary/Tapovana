const http = require('http');

http.get('http://localhost:5000/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP 5000 Health:', res.statusCode, data);
  });
}).on('error', (err) => {
  console.error('HTTP 5000 Error:', err.message);
});
