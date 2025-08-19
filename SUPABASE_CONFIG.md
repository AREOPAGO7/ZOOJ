# Supabase Configuration for No Email Confirmation

To disable email confirmation and allow automatic user login after signup, you need to configure your Supabase project settings.

## Required Supabase Project Settings

### 1. Authentication Settings
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, disable the following options:
   - ❌ **Enable email confirmations**
   - ❌ **Enable email change confirmations**
   - ❌ **Enable phone confirmations**

### 2. Email Templates (Optional)
If you want to customize the email templates:
1. Go to **Authentication** → **Email Templates**
2. You can customize the templates or leave them as default

### 3. RLS Policies
Ensure your database tables have proper Row Level Security (RLS) policies:

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own profile
CREATE POLICY "Users can manage their own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Enable RLS on couples table
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own couple relationships
CREATE POLICY "Users can manage their own couple relationships" ON couples
    FOR ALL USING (auth.uid() = user1_id OR auth.uid() = user2_id);
```

## What This Configuration Does

- **No Email Confirmation**: Users can sign up and immediately use the app
- **Automatic Login**: After signup, users are automatically signed in
- **Immediate Access**: Users can create profiles and use all features right away

## Security Considerations

⚠️ **Warning**: Disabling email confirmation means:
- Anyone with a valid email can create an account
- No verification that the email belongs to the user
- Consider implementing additional verification methods for production

## Testing

After applying these settings:
1. Users can sign up with any email/password
2. They are automatically logged in after signup
3. No email confirmation step is required
4. Users can immediately access profile creation

## Production Considerations

For production apps, consider:
- Implementing phone verification
- Adding CAPTCHA or other anti-bot measures
- Using social login providers
- Implementing manual approval workflows
