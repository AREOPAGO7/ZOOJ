/**
 * Password Reset Test Script
 * 
 * This script helps test the password reset functionality by simulating
 * the deep link URL that Supabase would generate.
 * 
 * Usage:
 * 1. Run this script to generate test URLs
 * 2. Use the URLs to test deep link handling in your app
 * 3. Check console logs for proper token extraction
 */

// Simulate Supabase password reset URL format
function generateTestResetUrl() {
  // These are example tokens - in real usage, Supabase generates these
  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM0NTQ4MDAwLCJpYXQiOjE3MzQ1NDQ0MDAsImlzcyI6Imh0dHBzOi8veW91ci1wcm9qZWN0LnN1cGFiYXNlLmNvIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnt9LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTczNDU0NDQwMH1dLCJzZXNzaW9uX2lkIjoiMTIzNDU2NzgtYWJjZC1lZmdoLWlqay1sbW5vcHFyc3R1diIsImlzX2Fub255bW91cyI6ZmFsc2V9.example_signature'
  
  const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM0NjMwODAwLCJpYXQiOjE3MzQ1NDQ0MDAsImlzcyI6Imh0dHBzOi8veW91ci1wcm9qZWN0LnN1cGFiYXNlLmNvIiwicmVmcmVzaF90b2tlbiI6InJlZnJlc2hfdG9rZW5fdmFsdWUiLCJ1c2VyX2lkIjoiMTIzNDU2NzgtYWJjZC1lZmdoLWlqay1sbW5vcHFyc3R1diIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3MzQ1NDQ0MDB9XSwic2Vzc2lvbl9pZCI6IjEyMzQ1Njc4LWFiY2QtZWZnaC1pamstbG1ub3BxcnN0dXYiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.example_refresh_signature'
  
  // Generate URLs in different formats for testing
  const urls = {
    // Hash-based URL (most common in mobile deep links)
    hashBased: `zooj://reset-password#access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&type=recovery`,
    
    // Query parameter-based URL (fallback)
    queryBased: `zooj://reset-password?access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&type=recovery`,
    
    // URL with additional parameters (real-world scenario)
    withExtraParams: `zooj://reset-password#access_token=${mockAccessToken}&refresh_token=${mockRefreshToken}&type=recovery&expires_in=3600&token_type=bearer`
  }
  
  return urls
}

// Test URL parsing logic
function testUrlParsing(url) {
  console.log(`\nTesting URL: ${url}`)
  
  let accessToken, refreshToken
  
  if (url.includes('#')) {
    // Hash-based URL parsing
    const hashPart = url.split('#')[1]
    accessToken = hashPart.split('access_token=')[1]?.split('&')[0]
    refreshToken = hashPart.split('refresh_token=')[1]?.split('&')[0]
    console.log('  Parsing method: Hash-based')
  } else {
    // Query parameter-based URL parsing
    try {
      const urlObj = new URL(url)
      accessToken = urlObj.searchParams.get('access_token')
      refreshToken = urlObj.searchParams.get('refresh_token')
      console.log('  Parsing method: Query parameter-based')
    } catch (error) {
      console.log('  Error parsing URL:', error.message)
      return false
    }
  }
  
  console.log(`  Access token found: ${accessToken ? 'Yes' : 'No'}`)
  console.log(`  Refresh token found: ${refreshToken ? 'Yes' : 'No'}`)
  
  if (accessToken) {
    console.log(`  Access token preview: ${accessToken.substring(0, 50)}...`)
  }
  
  return accessToken && refreshToken
}

// Main test function
function runTests() {
  console.log('🔐 Password Reset Deep Link Test')
  console.log('================================')
  
  const testUrls = generateTestResetUrl()
  
  console.log('\n📱 Generated Test URLs:')
  Object.entries(testUrls).forEach(([type, url]) => {
    console.log(`\n${type}:`)
    console.log(url)
  })
  
  console.log('\n🧪 Testing URL Parsing:')
  Object.entries(testUrls).forEach(([type, url]) => {
    const success = testUrlParsing(url)
    console.log(`  ${type}: ${success ? '✅ PASS' : '❌ FAIL'}`)
  })
  
  console.log('\n📋 Testing Instructions:')
  console.log('1. Copy one of the test URLs above')
  console.log('2. Open the URL in your mobile device browser')
  console.log('3. It should prompt to open your ZOOJ app')
  console.log('4. Check console logs for deep link processing')
  console.log('5. Verify navigation to password reset screen')
  
  console.log('\n🔧 Supabase Configuration Required:')
  console.log('1. Site URL: zooj://')
  console.log('2. Redirect URLs: zooj://reset-password, zooj://')
  console.log('3. Test with real email addresses')
  
  console.log('\n⚠️  Note: These are mock tokens for testing only!')
  console.log('Real Supabase tokens will be different.')
}

// Run the tests
runTests()

