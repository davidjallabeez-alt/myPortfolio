const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// M-Pesa Configuration
const MPESA_CONFIG = {
  shortCode: process.env.MPESA_SHORTCODE || '174379',
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd1a503b9a',
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'Your_Consumer_Key_Here',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'Your_Consumer_Secret_Here',
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox' // 'production' or 'sandbox'
};

// M-Pesa URLs
const MPESA_URLS = {
  sandbox: {
    oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  },
  production: {
    oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  }
};

let accessToken = null;
let tokenExpiry = 0;

// Get M-Pesa Access Token
async function getAccessToken() {
  try {
    // Return cached token if still valid
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    const auth = Buffer.from(
      `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
    ).toString('base64');

    const response = await axios.get(
      MPESA_URLS[MPESA_CONFIG.environment].oauth,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 10000; // Refresh 10s before expiry
    
    console.log('✓ M-Pesa access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with M-Pesa');
  }
}

// Format timestamp
function getTimestamp() {
  const now = new Date();
  return now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
}

// Generate password
function generatePassword() {
  const timestamp = getTimestamp();
  const combined = MPESA_CONFIG.shortCode + MPESA_CONFIG.passkey + timestamp;
  return Buffer.from(combined).toString('base64');
}

// STK Push Endpoint
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { phone, amount } = req.body;

    // Validation
    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone number and amount required' });
    }

    // Format phone: convert to 254XXXXXXXXX format
    let formattedPhone = phone.toString().trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Validate amount
    const numAmount = parseInt(amount);
    if (numAmount < 1 || numAmount > 150000) {
      return res.status(400).json({ error: 'Amount must be between 1 and 150,000 KES' });
    }

    console.log(`\n📱 Processing STK Push:`);
    console.log(`   Phone: ${formattedPhone}`);
    console.log(`   Amount: KES ${numAmount}`);

    // Get access token
    const token = await getAccessToken();

    // Generate timestamp and password
    const timestamp = getTimestamp();
    const password = generatePassword();

    // Prepare STK Push request
    const stkPushRequest = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: numAmount,
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/mpesa/callback`,
      AccountReference: 'Cheki-Cheki-Shop',
      TransactionDesc: 'Payment for online purchase'
    };

    console.log('   Sending to M-Pesa...');

    // Send STK Push request
    const response = await axios.post(
      MPESA_URLS[MPESA_CONFIG.environment].stkpush,
      stkPushRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✓ STK Push sent successfully');
    console.log(`   Response Code: ${response.data.ResponseCode}`);

    if (response.data.ResponseCode === '0') {
      return res.json({
        success: true,
        message: 'STK Push sent successfully',
        data: response.data
      });
    } else {
      throw new Error(response.data.ResponseDescription || 'STK Push failed');
    }

  } catch (error) {
    console.error('❌ STK Push Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.ResponseDescription || error.message || 'STK Push failed'
    });
  }
});

// M-Pesa Callback Endpoint
app.post('/api/mpesa/callback', (req, res) => {
  try {
    const callbackData = req.body;
    console.log('\n💰 M-Pesa Callback Received:');
    console.log(JSON.stringify(callbackData, null, 2));

    // TODO: Save transaction to database
    // TODO: Update order status based on result code

    res.json({ ResultCode: 0, ResultDesc: 'Callback received' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: MPESA_CONFIG.environment,
    timestamp: new Date().toISOString()
  });
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Cheki-Cheki Backend Server Running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔐 M-Pesa Environment: ${MPESA_CONFIG.environment}`);
  console.log(`📊 Shortcode: ${MPESA_CONFIG.shortCode}`);
  console.log('\n⚠️  IMPORTANT: Set your M-Pesa credentials in .env file\n');
});
