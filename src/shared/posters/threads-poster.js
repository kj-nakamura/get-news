/*
TODOs (threads-poster.js)
- [x] Setup Threads API client with 2-step posting process
- [x] Create post publishing function
- [x] Add error handling and rate limiting
- [x] Add validation for post content
- [x] Support dry-run mode for testing
*/

class ThreadsPoster {
  constructor(options = {}) {
    const {
      accessToken = process.env.THREADS_ACCESS_TOKEN,
      userId = process.env.THREADS_USER_ID,
      appId = process.env.THREADS_APP_ID,
      appSecret = process.env.THREADS_APP_SECRET,
      dryRun = false
    } = options;

    // Check if we have direct access token or need to generate one
    if (accessToken && userId) {
      this.dryRun = dryRun;
      this.accessToken = accessToken;
      this.userId = userId;
      this.baseUrl = 'https://graph.threads.net/v1.0';
    } else if (appId && appSecret && userId) {
      this.dryRun = dryRun;
      this.appId = appId;
      this.appSecret = appSecret;
      this.userId = userId;
      this.baseUrl = 'https://graph.threads.net/v1.0';
      this.needsTokenGeneration = true;
    } else {
      if (!dryRun) {
        throw new Error('Threads API credentials are required. Set either (THREADS_ACCESS_TOKEN + THREADS_USER_ID) or (THREADS_APP_ID + THREADS_APP_SECRET + THREADS_USER_ID) environment variables.');
      }
      console.warn('⚠️ Threads credentials missing. Running in dry-run mode.');
      this.dryRun = true;
    }
    
    this.lastRequest = null;
    this.minInterval = 1000; // 1秒間隔でレート制限対策
  }

  /**
   * Validate post content before publishing
   * @param {string} postText - The post text to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validatePost(postText) {
    const errors = [];
    
    if (!postText || typeof postText !== 'string') {
      errors.push('Post text is required and must be a string');
    }
    
    if (postText && postText.length === 0) {
      errors.push('Post text cannot be empty');
    }
    
    // Threads allows up to 500 characters
    if (postText && postText.length > 500) {
      errors.push(`Post is too long: ${postText.length} characters (max: 500)`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      length: postText ? postText.length : 0
    };
  }

  /**
   * Rate limiting helper
   */
  async waitIfNeeded() {
    const now = Date.now();
    if (this.lastRequest && now - this.lastRequest < this.minInterval) {
      const waitTime = this.minInterval - (now - this.lastRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequest = Date.now();
  }

  /**
   * Generate access token from APP_ID and APP_SECRET
   * @returns {Promise<string>} Access token
   */
  async generateAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }
    
    if (!this.needsTokenGeneration) {
      throw new Error('No access token available and token generation not configured');
    }
    
    try {
      console.log('🔄 Generating Threads access token...');
      console.log('⚠️ Note: APP_ID/APP_SECRET method may require user authorization flow for Threads API');
      
      // Generate app access token
      const tokenUrl = `https://graph.facebook.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`;
      
      console.log(`🌐 Token request URL: ${tokenUrl.replace(this.appSecret, '***')}`);
      
      const response = await fetch(tokenUrl, { method: 'GET' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to generate access token: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token returned from API');
      }
      
      console.log('✅ Access token generated successfully');
      console.log(`🔑 Token type: ${data.token_type || 'unknown'}`);
      
      this.accessToken = data.access_token;
      
      return this.accessToken;
    } catch (error) {
      console.error('💥 Failed to generate access token:', error.message);
      console.error('💡 For Threads API, you may need to:');
      console.error('   1. Use a long-lived user access token instead');
      console.error('   2. Complete the Meta Business verification process');
      console.error('   3. Ensure your app has threads_basic permission');
      throw error;
    }
  }

  /**
   * Make HTTP request to Threads API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Request parameters
   * @param {string} method - HTTP method
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, params = {}, method = 'POST') {
    await this.waitIfNeeded();
    
    // Generate access token if needed
    if (this.needsTokenGeneration && !this.accessToken) {
      await this.generateAccessToken();
    }
    
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (method === 'POST') {
      const formData = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value);
      });
      options.body = formData;
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Threads API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  }

  /**
   * Create a media container for the post
   * @param {string} postText - The post text
   * @returns {Promise<string>} Container ID
   */
  async createMediaContainer(postText) {
    const params = {
      media_type: 'TEXT',
      text: postText,
      access_token: this.accessToken
    };

    console.log('🔄 Creating Threads media container...');
    const response = await this.makeRequest(`${this.userId}/threads`, params);
    
    if (!response.id) {
      throw new Error('Failed to create media container: No ID returned');
    }
    
    console.log(`✅ Media container created: ${response.id}`);
    return response.id;
  }

  /**
   * Publish the media container
   * @param {string} containerId - Container ID from createMediaContainer
   * @returns {Promise<Object>} Published post data
   */
  async publishContainer(containerId) {
    const params = {
      creation_id: containerId,
      access_token: this.accessToken
    };

    console.log('🔄 Publishing Threads post...');
    const response = await this.makeRequest(`${this.userId}/threads_publish`, params);
    
    if (!response.id) {
      throw new Error('Failed to publish container: No ID returned');
    }
    
    console.log(`✅ Post published: ${response.id}`);
    return response;
  }

  /**
   * Publish a post to Threads
   * @param {string} postText - The post text to publish
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Post publishing result
   */
  async publishPost(postText, options = {}) {
    const { validateOnly = false } = options;
    
    // Validate post content
    const validation = this.validatePost(postText);
    
    if (!validation.isValid) {
      console.error('❌ Post validation failed:', validation.errors);
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        postText
      };
    }
    
    console.log(`📝 Post validation passed: ${validation.length} characters`);
    
    if (validateOnly) {
      return {
        success: true,
        validated: true,
        postText,
        length: validation.length
      };
    }
    
    // Dry run mode
    if (this.dryRun) {
      console.log('🔄 DRY RUN MODE - Would publish the following Threads post:');
      console.log('━'.repeat(50));
      console.log(postText);
      console.log('━'.repeat(50));
      console.log(`📏 Length: ${validation.length} characters`);
      
      return {
        success: true,
        dryRun: true,
        postText,
        length: validation.length,
        id: 'dry-run-threads-' + Date.now()
      };
    }
    
    try {
      console.log('📤 Publishing post to Threads...');
      
      // Step 1: Create media container
      const containerId = await this.createMediaContainer(postText);
      
      // Step 2: Publish the container
      const publishResult = await this.publishContainer(containerId);
      
      console.log('✅ Threads post published successfully!');
      console.log(`🔗 Post ID: ${publishResult.id}`);
      console.log(`🔗 Post URL: https://threads.net/@username/post/${publishResult.id}`);
      
      return {
        success: true,
        post: publishResult,
        postText,
        length: validation.length,
        id: publishResult.id,
        containerId,
        url: `https://threads.net/@username/post/${publishResult.id}`
      };
      
    } catch (error) {
      console.error('💥 Failed to publish Threads post:', error.message || error);
      
      // Handle rate limiting
      if (error.message.includes('429')) {
        console.error('🔄 Rate limited. Please try again later.');
        return {
          success: false,
          error: 'Rate limited',
          details: error.message
        };
      }
      
      // Handle duplicate posts
      if (error.message.includes('duplicate') || error.message.includes('already posted')) {
        console.error('🔁 Duplicate post detected.');
        return {
          success: false,
          error: 'Duplicate post',
          details: error.message
        };
      }
      
      return {
        success: false,
        error: 'Threads API error',
        details: error.message || error
      };
    }
  }

  /**
   * Get user information (for testing credentials)
   * @returns {Promise<Object>} User information
   */
  async getUserInfo() {
    if (this.dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Dry run mode - cannot fetch real user info'
      };
    }
    
    try {
      // Generate access token if needed
      if (this.needsTokenGeneration && !this.accessToken) {
        await this.generateAccessToken();
      }
      
      console.log(`🔍 Testing Threads API with User ID: ${this.userId}`);
      
      // Try simpler fields first to test basic connectivity
      const params = {
        fields: 'id,username',
        access_token: this.accessToken
      };
      
      console.log(`🌐 Making request to: ${this.baseUrl}/${this.userId}`);
      
      const user = await this.makeRequest(this.userId, params, 'GET');
      console.log(`✅ Connected as Threads user: ${user.username || user.id}`);
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('💥 Failed to get Threads user info:', error.message || error);
      
      // Try to provide more helpful error information
      if (error.message.includes('500')) {
        console.error('🔍 Debug info:');
        console.error(`   User ID: ${this.userId}`);
        console.error(`   Has Access Token: ${!!this.accessToken}`);
        console.error(`   Token Generation Mode: ${!!this.needsTokenGeneration}`);
        console.error('💡 Possible causes:');
        console.error('   - Incorrect THREADS_USER_ID format');
        console.error('   - Missing app permissions (threads_basic)');
        console.error('   - Invalid app configuration');
      }
      
      return {
        success: false,
        error: error.message || error
      };
    }
  }
}

export default ThreadsPoster;