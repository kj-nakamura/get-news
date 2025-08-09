/*
Test script to verify Threads API access and get user info
*/

import dotenv from 'dotenv';

dotenv.config();

async function testThreadsAPI() {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ Missing THREADS_ACCESS_TOKEN');
    return;
  }
  
  console.log('🔑 Testing Threads API with provided access token');
  
  try {
    // Try to get user info using /me endpoint
    console.log('🔍 Testing /me endpoint...');
    const meUrl = `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${accessToken}`;
    
    const response = await fetch(meUrl, { method: 'GET' });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      
      if (response.status === 400) {
        console.log('\n💡 Possible solutions:');
        console.log('1. Verify your THREADS_ACCESS_TOKEN is valid and not expired');
        console.log('2. Check if your token has the required permissions (threads_basic)');
        console.log('3. Make sure your Meta app is configured for Threads API');
      }
      return;
    }
    
    const userData = await response.json();
    console.log('✅ API call successful!');
    console.log('User data:', JSON.stringify(userData, null, 2));
    
    if (userData.id) {
      console.log('\n🎯 Update your .env file:');
      console.log(`THREADS_USER_ID=${userData.id}`);
      console.log(`# Username: ${userData.username || 'N/A'}`);
      console.log(`# Name: ${userData.name || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('💥 Network error:', error.message);
  }
}

testThreadsAPI();