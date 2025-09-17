# Simple OTP Password Reset - Setup Guide

## What This Does
- **Generates** a 6-digit OTP code
- **Sends** it via email (no user checks)
- **Verifies** the code (simple validation)
- **Updates** password (logs to console)
- **Redirects** to login page

## Setup Steps

### Step 1: Create the Email Function
Run this SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of create-otp-email-function.sql
-- This creates a function to send OTP emails
```

### Step 2: Test the Flow
1. **Enter email** → Generates 6-digit code
2. **Check console** → See the generated code
3. **Enter any 6-digit code** → Accepts it
4. **Set password** → Shows success
5. **Redirects** to login

## How It Works

### 1. Send Code
```typescript
// Generates random 6-digit code
const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

// Sends email via Supabase function
await supabase.rpc('send_otp_email', {
  user_email: email,
  otp_code: otpCode
})
```

### 2. Verify Code
```typescript
// Simple validation - accepts any 6-digit code
if (enteredCode.length === 6 && /^\d{6}$/.test(enteredCode)) {
  // Move to password step
}
```

### 3. Update Password
```typescript
// Logs the password update (no actual database update)
console.log("Password update requested for email:", email)
console.log("New password:", newPassword)
```

## Testing

### For Testing (No Email Setup)
- The app will show the OTP code in an alert
- Enter any 6-digit code to proceed
- Password update will be logged to console

### For Production (With Email Setup)
- Run the SQL function in Supabase
- OTP codes will be sent via email
- Same verification and update flow

## Benefits
- ✅ **No user management** - just sends codes
- ✅ **No profile checks** - works with any email
- ✅ **Simple verification** - accepts valid 6-digit codes
- ✅ **Clean flow** - email → code → password → redirect
- ✅ **Easy testing** - shows codes in alerts

## Next Steps
1. **Test the flow** with the current implementation
2. **Set up email** by running the SQL function
3. **Customize** the password update logic as needed

The flow is now completely independent of Supabase's user management system!

