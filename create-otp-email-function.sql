-- Simple OTP Email Function for Supabase
-- This function sends OTP codes via email without user management

CREATE OR REPLACE FUNCTION send_otp_email(
  user_email TEXT,
  otp_code TEXT,
  email_type TEXT DEFAULT 'password-reset'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Send email with OTP code
  PERFORM
    auth.email_send(
      user_email,
      'Password Reset Code',
      '<h2>Password Reset Code</h2>
       <p>Your verification code is:</p>
       <h1 style="font-size: 32px; letter-spacing: 4px; color: #2DB6FF; text-align: center;">' || otp_code || '</h1>
       <p>Enter this 6-digit code in the app to reset your password.</p>
       <p>This code expires in 1 hour.</p>
       <p>If you didn''t request this code, please ignore this email.</p>'
    );
  
  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'OTP code sent successfully',
    'otp_code', otp_code
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    result := json_build_object(
      'success', false,
      'message', 'Failed to send OTP code: ' || SQLERRM
    );
    
    RETURN result;
END;
$$;

