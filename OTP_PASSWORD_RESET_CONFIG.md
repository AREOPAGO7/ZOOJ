# OTP Password Reset Configuration

## Supabase Configuration Required

To enable OTP codes for password reset instead of email links, you need to configure your Supabase project:

### 1. **Enable OTP for Password Reset**

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, make sure these settings are configured:
   - ✅ **Enable email confirmations** (should be enabled)
   - ✅ **Enable email change confirmations** (should be enabled)

### 2. **Email Templates Configuration**

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Make sure the template is configured to send OTP codes
4. The template should include a verification code, not a link

### 3. **Alternative: Use Supabase Auth Helpers**

If OTP is not working with the current setup, you can use Supabase's built-in OTP method:

```typescript
// Alternative OTP method
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    shouldCreateUser: false, // Don't create user if doesn't exist
  }
})
```

### 4. **Test Configuration**

1. Try sending a password reset request
2. Check your email for a verification code (not a link)
3. Enter the code in the OTP step
4. Verify the password update works

## Current Implementation

The password reset page now works as follows:

1. **Step 1**: User enters email → Sends OTP code
2. **Step 2**: User enters OTP code → Verifies code
3. **Step 3**: User sets new password → Updates password

## Troubleshooting

### If you're not receiving OTP codes:

1. **Check Supabase logs**: Go to **Logs** → **Auth** to see if emails are being sent
2. **Check spam folder**: OTP emails might be filtered
3. **Verify email template**: Make sure the template is configured for OTP
4. **Test with different email**: Try with a different email provider

### If OTP verification fails:

1. **Check code format**: Make sure you're entering the exact code from email
2. **Check expiration**: OTP codes expire after a certain time
3. **Check Supabase logs**: Look for verification errors

## Fallback Option

If OTP doesn't work, you can fall back to the email link method by:

1. Changing the redirect URL back to a web URL
2. Using the deep link handling code
3. Processing the recovery tokens from the email link

The current implementation is set up for OTP codes, which is more secure and user-friendly than email links.

