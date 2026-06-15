const http = require('http');

const email = 'admin@tapovana.com';
const password = 'Admin@1234';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function verify() {
  try {
    console.log('1. Initiating Login Password step...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login/password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { email, password });

    console.log('Login Password response status:', loginRes.status);
    console.log('Login Password response body:', loginRes.data);

    if (!loginRes.data.success) {
      throw new Error('Password check failed');
    }

    console.log('\n2. Initiating OTP Verification step (using dev bypass 000000)...');
    const otpRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login/otp/verify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { email, otp: '000000' });

    console.log('OTP verification response status:', otpRes.status);
    if (!otpRes.data.success) {
      throw new Error('OTP verification failed: ' + JSON.stringify(otpRes.data));
    }

    const token = otpRes.data.token;
    console.log('Token successfully obtained!');

    // 3. Verify Home Summary
    console.log('\n3. Fetching /api/home...');
    const homeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/home',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Home Status:', homeRes.status);
    console.log('Home Data:', JSON.stringify(homeRes.data, null, 2));

    // 4. Verify Customers list
    console.log('\n4. Fetching /api/customers...');
    const custRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/customers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Customers Status:', custRes.status);
    console.log(`Received ${custRes.data?.customers?.length} customers.`);
    console.log('First customer details:', JSON.stringify(custRes.data?.customers?.[0], null, 2));

    // 5. Verify Transactions ledger
    console.log('\n5. Fetching /api/transactions...');
    const txnsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/transactions',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Transactions Status:', txnsRes.status);
    console.log(`Received ${txnsRes.data?.transactions?.length} transactions.`);
    console.log('Summary metrics:', JSON.stringify(txnsRes.data?.summary, null, 2));
    console.log('First transaction details:', JSON.stringify(txnsRes.data?.transactions?.[0], null, 2));

  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

verify();
