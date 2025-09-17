# OTP Code Configuration for Supabase

## The Problem
You want to receive a 6-digit OTP code in your email instead of clicking on links. The current implementation uses `resetPasswordForEmail()` with OTP verification.

## Supabase Configuration Required

### Step 1: Enable Password Reset with OTP
1. Go to your **Supabase project dashboard**
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, ensure:
   - ✅ **Enable email confirmations** (should be enabled)
   - ✅ **Enable email change confirmations** (should be enabled)

### Step 2: Configure Email Template for Password Reset
1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Update the template to include the OTP code:

```html
<h2>Password Reset Code</h2>
<p>Your verification code is:</p>
<h1 style="font-size: 32px; letter-spacing: 4px; color: #2DB6FF;">{{ .Token }}</h1>
<p>Enter this code in the app to reset your password.</p>
<p>This code expires in 1 hour.</p>
```

### Step 3: Configure Site URL and Redirect URLs
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `zooj://`
3. Add **Redirect URLs**:
   ```
   zooj://reset-password
   zooj://
   ```

## Current Implementation

The app now uses:
- `resetPasswordForEmail()` to send password reset with OTP
- `verifyOtp()` with type 'recovery' to verify codes
- Direct password update after OTP verification

## Expected Flow

1. **Enter email** → Receive 6-digit OTP code in email
2. **Enter code** → Verify code and move to password step
3. **Set password** → Update password and redirect to login

## Troubleshooting

### If you don't receive OTP codes:

1. **Check Supabase logs**:
   - Go to **Logs** → **Auth**
   - Look for password reset attempts
   - Check for any errors

2. **Check email template**:
   - Make sure it includes `{{ .Token }}`
   - Verify the template is active

3. **Test with different email**:
   - Try Gmail, Outlook, Yahoo
   - Check spam folder

4. **Verify Supabase settings**:
   - Email confirmations enabled
   - SMTP configured properly

### If OTP verification fails:

1. **Check code format**: Enter exact 6-digit code from email
2. **Check expiration**: OTP codes expire after 1 hour
3. **Check Supabase logs**: Look for verification errors

## Key Changes Made

- ✅ **Fixed**: Changed from `signInWithOtp()` to `resetPasswordForEmail()`
- ✅ **Fixed**: Changed OTP verification type from 'email' to 'recovery'
- ✅ **Fixed**: Removed the "Signups not allowed for otp" error

The OTP code should now be sent to your email as a 6-digit number!