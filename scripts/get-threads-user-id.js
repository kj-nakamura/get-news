/*
Helper script to get Threads User ID from username
Usage: node scripts/get-threads-user-id.js [username]
*/

import dotenv from 'dotenv';

dotenv.config();

async function getThreadsUserId(username) {
  const appId = process.env.THREADS_APP_ID;
  const appSecret = process.env.THREADS_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.error('❌ Missing THREADS_APP_ID or THREADS_APP_SECRET');
    return;
  }
  
  try {
    // Generate access token
    console.log('🔄 Generating access token...');
    const tokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('❌ Failed to generate access token:', tokenData);
      return;
    }
    
    console.log('✅ Access token generated');
    
    // Search for user by username (this might not work directly)
    console.log(`🔍 Searching for user: ${username}`);
    
    // Unfortunately, Threads API doesn't provide a direct way to convert username to User ID
    // You need to get the User ID from Meta Business Manager or during the OAuth flow
    
    console.log('💡 To get your Threads User ID:');
    console.log('1. Go to Meta for Developers: https://developers.facebook.com/');
    console.log('2. Select your app');
    console.log('3. Go to Threads > API Setup');
    console.log('4. Your Threads User ID should be displayed there');
    console.log('5. Or use Graph API Explorer to call /me with your user access token');
    
    console.log('\n🔧 Alternative method:');
    console.log('If you have a user access token (not app token), try:');
    console.log('curl "https://graph.threads.net/v1.0/me?access_token=YOUR_USER_ACCESS_TOKEN"');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

const username = process.argv[2] || process.env.THREADS_USER_ID || 'ceotama';
console.log(`🚀 Getting Threads User ID for: ${username}`);
getThreadsUserId(username);