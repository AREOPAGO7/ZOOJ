# ZOOJ Authentication System

This document explains how the Supabase authentication system works in the ZOOJ app.

## Overview

The authentication system provides:
- User registration with email and password
- User login with email and password
- Profile creation and management
- Couple relationship setup
- Secure user data storage

## Database Schema

The system uses two main tables:

### Profiles Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        VARCHAR(100),
    birth_date  DATE,
    gender      VARCHAR(10) CHECK (gender IN ('male','female','other')),
    country     VARCHAR(100),
    interests   TEXT[],
    invite_code VARCHAR(10) UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Couples Table
```sql
CREATE TABLE couples (
    id BIGSERIAL PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);
```

## File Structure

```
lib/
├── auth.ts              # Authentication context and hooks
├── profileService.ts    # Profile-related database operations
└── supabase.js         # Supabase client configuration

components/
└── ProfileEditor.tsx   # Profile editing component

app/
├── _layout.tsx         # Root layout with AuthProvider
└── (tabs)/
    └── index.tsx       # Main app with authentication flow
```

## How It Works

### 1. Authentication Flow

1. **Welcome Screen**: User starts at welcome screen
2. **Auth Screen**: User can choose to sign in or create account
3. **Sign Up**: User creates account with email/password
4. **Profile Creation**: User fills out profile information
5. **Love Story Setup**: User sets up couple information
6. **Main App**: User is now authenticated and can use the app

### 2. User State Management

The `useAuth` hook provides:
- `user`: Current authenticated user object
- `session`: Current session information
- `loading`: Authentication state loading indicator
- `signUp(email, password)`: Register new user
- `signIn(email, password)`: Sign in existing user
- `signOut()`: Sign out current user
- `createProfile(profileData)`: Create user profile

### 3. Profile Management

The `profileService` provides:
- `createProfile(profileData)`: Create new profile
- `getProfile(userId)`: Get profile by user ID
- `updateProfile(userId, updates)`: Update existing profile
- `createCouple(user1Id, user2Id)`: Create couple relationship
- `generateInviteCode()`: Generate unique invite code
- `findProfileByInviteCode(code)`: Find profile by invite code

## Usage Examples

### Using the Authentication Hook

```tsx
import { useAuth } from '@/lib/auth'

function MyComponent() {
  const { user, signIn, signOut } = useAuth()
  
  const handleLogin = async () => {
    const { error } = await signIn('user@example.com', 'password')
    if (error) {
      console.error('Login failed:', error.message)
    }
  }
  
  return (
    <View>
      {user ? (
        <Text>Welcome, {user.email}</Text>
      ) : (
        <Text>Please sign in</Text>
      )}
    </View>
  )
}
```

### Creating a Profile

```tsx
import { profileService } from '@/lib/profileService'

const createUserProfile = async (userId: string) => {
  const profileData = {
    name: 'John Doe',
    country: 'France',
    gender: 'male',
    birth_date: '1990-01-01'
  }
  
  const { data, error } = await profileService.createProfile({
    id: userId,
    ...profileData
  })
  
  if (error) {
    console.error('Profile creation failed:', error)
  } else {
    console.log('Profile created:', data)
  }
}
```

### Editing a Profile

```tsx
import ProfileEditor from '@/components/ProfileEditor'

function ProfileScreen() {
  const handleProfileUpdated = (updatedProfile) => {
    console.log('Profile updated:', updatedProfile)
    // Handle profile update success
  }
  
  return (
    <ProfileEditor 
      onProfileUpdated={handleProfileUpdated}
      onBack={() => navigation.goBack()}
    />
  )
}
```

## Security Features

1. **Row Level Security (RLS)**: Database tables use RLS policies
2. **JWT Tokens**: Secure authentication using Supabase JWT tokens
3. **User Isolation**: Users can only access their own data
4. **Input Validation**: Client-side and server-side validation
5. **Secure Storage**: Sensitive data is not stored locally

## Error Handling

The system provides comprehensive error handling:
- Network errors
- Authentication errors
- Validation errors
- Database errors
- User-friendly error messages in French

## Future Enhancements

1. **Password Reset**: Email-based password reset functionality
2. **Email Verification**: Email verification for new accounts
3. **Social Login**: Google, Facebook, Apple sign-in options
4. **Two-Factor Authentication**: Enhanced security with 2FA
5. **Profile Pictures**: Image upload and management
6. **Push Notifications**: Real-time notifications for couples

## Troubleshooting

### Common Issues

1. **Authentication Failed**: Check email/password and network connection
2. **Profile Not Loading**: Verify user is authenticated and profile exists
3. **Database Errors**: Check Supabase connection and table permissions
4. **State Issues**: Ensure AuthProvider wraps the entire app

### Debug Mode

Enable debug logging by setting environment variables:
```bash
SUPABASE_DEBUG=true
```

## Support

For technical support or questions about the authentication system, please refer to:
- Supabase documentation: https://supabase.com/docs
- React Native documentation: https://reactnative.dev/docs
- Expo documentation: https://docs.expo.dev
