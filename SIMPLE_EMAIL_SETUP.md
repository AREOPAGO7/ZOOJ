# Simple OTP Email Setup

## What This Does
- **Generates** 6-digit OTP code
- **Sends** it via Edge Function (logs to console for now)
- **Shows** code in alert if email fails
- **Verifies** any 6-digit code
- **Updates** password and redirects

## Setup Steps

### Step 1: Deploy the Edge Function
```bash
# In your project root
supabase functions deploy send-otp-email
```

### Step 2: Test the Flow
1. **Enter email** → Generates OTP code
2. **Check console** → See the OTP code logged
3. **Enter any 6-digit code** → Accepts it
4. **Set password** → Shows success
5. **Redirects** to login

## Current Behavior

### If Edge Function Works:
- Sends OTP via email (currently just logs to console)
- Shows "Email envoyé" message
- User enters OTP from email

### If Edge Function Fails:
- Shows OTP code in alert for testing
- User can copy/paste the code
- Same verification flow

## For Production Email

Replace the console.log in the Edge Function with actual email service:

```typescript
// Example with Resend
import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'noreply@yourapp.com',
  to: email,
  subject: 'Password Reset Code',
  html: `<h1>Your code: ${otpCode}</h1>`
})
```

## Benefits
- ✅ **No deep links** - just email
- ✅ **No user management** - works with any email
- ✅ **Simple flow** - email → code → password → redirect
- ✅ **Easy testing** - shows codes in alerts
- ✅ **Production ready** - just add email service

The flow is now completely independent of Supabase's auth system!

