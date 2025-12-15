/*
TODOs (x-poster.js)
- [x] Setup X API v2 client
- [x] Create post publishing function
- [x] Add error handling and rate limiting
- [x] Add validation for post content
- [x] Support dry-run mode for testing
*/

import { TwitterApi } from 'twitter-api-v2';

class XPoster {
  constructor(options = {}) {
    const {
      apiKey = process.env.X_API_KEY,
      apiSecret = process.env.X_API_SECRET,
      accessToken = process.env.X_ACCESS_TOKEN,
      accessSecret = process.env.X_ACCESS_SECRET,
      dryRun = false
    } = options;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      if (!dryRun) {
        throw new Error('X API credentials are required. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_SECRET environment variables.');
      }
      console.warn('⚠️ X credentials missing. Running in dry-run mode.');
      this.dryRun = true;
    } else {
      this.dryRun = dryRun;
      
      if (!this.dryRun) {
        this.client = new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken: accessToken,
          accessSecret: accessSecret,
        });
        
        // v2 API client for posting to X
        this.xClient = this.client.v2;
      }
    }
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
    
    if (postText && postText.length > 280) {
      errors.push(`Post is too long: ${postText.length} characters (max: 280)`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      length: postText ? postText.length : 0
    };
  }

  /**
   * Publish a post to X
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
      console.log('🔄 DRY RUN MODE - Would publish the following post:');
      console.log('━'.repeat(50));
      console.log(postText);
      console.log('━'.repeat(50));
      console.log(`📏 Length: ${validation.length} characters`);
      
      return {
        success: true,
        dryRun: true,
        postText,
        length: validation.length,
        id: 'dry-run-' + Date.now()
      };
    }
    
    try {
      console.log('📤 Publishing post to X...');
      const post = await this.xClient.tweet(postText);
      
      console.log('✅ Post published successfully!');
      console.log(`🔗 Post ID: ${post.data.id}`);
      console.log(`🔗 Post URL: https://x.com/user/status/${post.data.id}`);
      
      return {
        success: true,
        post: post.data,
        postText,
        length: validation.length,
        id: post.data.id,
        url: `https://x.com/user/status/${post.data.id}`
      };
      
    } catch (error) {
      console.error('💥 Failed to publish post:', error.message || error);
      
      // Handle rate limiting
      if (error.code === 429) {
        console.error('🔄 Rate limited. Please try again later.');
        return {
          success: false,
          error: 'Rate limited',
          retryAfter: error.rateLimit?.reset,
          details: error.message
        };
      }
      
      // Handle duplicate posts
      if (error.code === 187) {
        console.error('🔁 Duplicate post detected.');
        return {
          success: false,
          error: 'Duplicate post',
          details: error.message
        };
      }
      
      return {
        success: false,
        error: 'X API error',
        details: error.message || error,
        code: error.code
      };
    }
  }

  /**
   * Get account information (for testing credentials)
   * @returns {Promise<Object>} Account information
   */
  async getAccountInfo() {
    if (this.dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Dry run mode - cannot fetch real account info'
      };
    }
    
    try {
      const user = await this.xClient.me();
      console.log(`✅ Connected as: @${user.data.username} (${user.data.name})`);
      
      return {
        success: true,
        user: user.data
      };
    } catch (error) {
      console.error('💥 Failed to get account info:', error.message || error);
      return {
        success: false,
        error: error.message || error
      };
    }
  }
}

export default XPoster;
