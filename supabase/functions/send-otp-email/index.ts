// Simple OTP Email Sender
// Save as: supabase/functions/send-otp-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otpCode } = await req.json()

    // For now, just log the OTP code
    // In production, you'd integrate with SendGrid, Resend, or similar
    console.log(`📧 Sending OTP ${otpCode} to ${email}`)
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP email sent successfully',
        otpCode: otpCode 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})