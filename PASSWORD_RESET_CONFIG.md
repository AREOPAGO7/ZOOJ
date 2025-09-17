# Password Reset Configuration for Mobile Production

This guide explains how to configure password reset functionality to work properly in mobile production environments.

## Overview

The password reset functionality uses deep linking to redirect users back to the app after clicking the reset link in their email. This requires proper configuration in both the app and Supabase.

## App Configuration

### 1. Deep Link Scheme

The app is configured with the scheme `zooj://` as defined in `app.json`:

```json
{
  "expo": {
    "scheme": "zooj"
  }
}
```

### 2. Password Reset Redirect URL

The password reset function in `lib/auth.tsx` uses the redirect URL:

```typescript
const redirectUrl = 'zooj://reset-password'
```

This deep link will open the app and navigate to the password reset screen.

## Supabase Configuration

### 1. Site URL Configuration

In your Supabase project dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set the **Site URL** to your app's deep link scheme:
   ```
   zooj://
   ```

### 2. Redirect URLs Configuration

In the same **URL Configuration** section, add the following redirect URLs:

```
zooj://reset-password
zooj://
```

**Important**: Make sure to add both URLs:
- `zooj://reset-password` - Specific redirect for password reset
- `zooj://` - General app scheme (fallback)

### 3. Email Templates (Optional)

You can customize the password reset email template:

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Customize the template if needed
4. The reset link will automatically use the configured redirect URL

## How It Works

1. **User requests password reset**: User enters email and clicks "Send reset email"
2. **Email sent**: Supabase sends email with reset link using `zooj://reset-password`
3. **User clicks link**: Mobile device opens the app via deep link
4. **App processes link**: App extracts tokens from URL and navigates to password reset screen
5. **User sets new password**: User enters new password and confirms
6. **Password updated**: App updates password using the recovery tokens

## Deep Link URL Format

The reset link will have this format:
```
zooj://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
```

The app handles both hash-based (`#`) and query parameter-based (`?`) URLs for maximum compatibility.

## Testing

### Development Testing

1. Use Expo Go or development build
2. Test with email addresses you can access
3. Check console logs for deep link processing

### Production Testing

1. Build production app (EAS Build)
2. Install on device
3. Test password reset flow with real email
4. Verify deep link opens app correctly

## Troubleshooting

### Common Issues

1. **Deep link doesn't open app**:
   - Check if `zooj://` scheme is properly configured in Supabase
   - Verify app is installed on device
   - Check device deep link settings

2. **"Invalid reset link" error**:
   - Verify redirect URLs are configured in Supabase
   - Check if tokens are being extracted correctly
   - Ensure URL format matches expected pattern

3. **App opens but doesn't navigate**:
   - Check deep link handling code in `index.tsx`
   - Verify URL parsing logic
   - Check console logs for errors

### Debug Steps

1. **Check Supabase logs**:
   - Go to **Logs** → **Auth** in Supabase dashboard
   - Look for password reset attempts

2. **Check app logs**:
   - Look for "Deep link received:" messages
   - Check token extraction logs
   - Verify navigation to new password screen

3. **Test URL manually**:
   - Try opening `zooj://reset-password` in browser
   - Should prompt to open app

## Security Considerations

1. **Token Expiration**: Recovery tokens expire after 1 hour by default
2. **One-time Use**: Tokens can only be used once
3. **HTTPS Required**: Supabase requires HTTPS for production
4. **URL Validation**: App validates token format before processing

## Production Checklist

- [ ] Supabase Site URL set to `zooj://`
- [ ] Redirect URLs configured: `zooj://reset-password` and `zooj://`
- [ ] App scheme properly configured in `app.json`
- [ ] Deep link handling code updated in `index.tsx`
- [ ] Password reset function updated in `lib/auth.tsx`
- [ ] Tested on production build
- [ ] Email templates customized (optional)

## Support

For issues with password reset functionality:

1. Check Supabase documentation: https://supabase.com/docs/guides/auth/password-reset
2. Verify deep linking setup: https://docs.expo.dev/guides/linking/
3. Review authentication logs in Supabase dashboard
4. Test with different email providers

