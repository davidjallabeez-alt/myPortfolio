# Cheki-Cheki Backend - M-Pesa Integration Guide

## 📋 Prerequisites

1. **Node.js** installed (v14 or higher)
2. **M-Pesa Business Account** with Safaricom
3. **API Credentials** from Safaricom Daraja portal

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Get M-Pesa Credentials

1. Go to [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
2. Create an account and log in
3. Create a new app to get:
   - **Consumer Key**
   - **Consumer Secret**
4. Note your **Business Shortcode** and **Passkey** (usually provided by Safaricom)

### Step 3: Configure Environment Variables

Create a `.env` file in the backend folder:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
MPESA_SHORTCODE=your_shortcode_here
MPESA_PASSKEY=your_passkey_here
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_ENVIRONMENT=sandbox
PORT=3000
BACKEND_URL=http://localhost:3000
```

> ⚠️ **Never commit .env to Git!** Add it to .gitignore

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
🚀 Cheki-Cheki Backend Server Running
📍 URL: http://localhost:3000
🔐 M-Pesa Environment: sandbox
```

### Step 5: Test with Frontend

1. Open `index.html` in your browser
2. Click any product category
3. Click "BUY NOW" on a product
4. Enter a test phone number: **0722000000** (sandbox test number)
5. Click CONFIRM

## 📱 Phone Number Format

The backend automatically converts phone numbers to the M-Pesa required format (254XXXXXXXXX):

- `0722000000` → `254722000000` ✓
- `254722000000` → `254722000000` ✓
- `722000000` → `254722000000` ✓

## 🧪 Sandbox Testing

### Test Credentials (Sandbox)
- **Shortcode**: 174379
- **Passkey**: bfb279f9aa9bdbcf158e97dd1a503b9a
- **Test Phone**: 0722000000 (for sandbox)

### Typical Response Flow:
1. Frontend sends phone + amount to backend
2. Backend authenticates with M-Pesa (gets access token)
3. Backend triggers STK Push to the phone
4. User enters PIN on their phone to complete payment
5. M-Pesa sends callback with payment status

## 🔄 Callback Handling

The backend listens for M-Pesa callbacks at:
```
POST http://localhost:3000/api/mpesa/callback
```

Currently logs callback data. In production, you should:
- Save transaction to database
- Update order status
- Send email confirmation
- Handle error cases

## 🚀 Deploying to Production

1. Change `MPESA_ENVIRONMENT=production` in `.env`
2. Update `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` to production values
3. Update `BACKEND_URL` to your production domain
4. Deploy to a hosting service (Heroku, Railway, AWS, etc.)
5. Make sure `.env` is properly secured

## ❌ Common Issues

### "Error connecting to M-Pesa. Is the backend server running?"
- Check if `npm start` is running in the backend folder
- Verify frontend has correct API URL: `http://localhost:3000`

### "Connection failed. For the prompt to work, you need a backend server running."
- Backend crashed or stopped
- Check terminal for error messages
- Run `npm start` again

### "Failed to authenticate with M-Pesa"
- Invalid Consumer Key/Secret
- Check credentials in `.env` file
- Make sure you're using sandbox credentials for sandbox environment

### "STK Push failed - Invalid shortcode"
- Wrong shortcode in `.env`
- Verify with Safaricom

## 📊 API Endpoints

### STK Push Request
```bash
POST http://localhost:3000/api/mpesa/stkpush
Content-Type: application/json

{
  "phone": "0722000000",
  "amount": 50000
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "STK Push sent successfully",
  "data": {
    "ResponseCode": "0",
    "ResponseDescription": "Success..."
  }
}
```

### Health Check
```bash
GET http://localhost:3000/api/health
```

## 🔐 Security Tips

1. **Never share `.env` file** - Contains sensitive credentials
2. **Use HTTPS in production** - Required by M-Pesa
3. **Validate amounts** - Range: 1 - 150,000 KES
4. **Validate phone numbers** - Use regex patterns
5. **Log transactions** - For auditing and debugging

## 📞 Support

For M-Pesa integration issues:
- [Safaricom Daraja Docs](https://developer.safaricom.co.ke/docs)
- [Daraja Forum](https://community.safaricom.co.ke)

---

**Created for Cheki-Cheki E-commerce Demo**
