/*
TODOs (multi-poster.js)
- [x] Unified interface for posting to multiple platforms
- [x] Support for X and Threads platforms
- [x] Flexible platform selection
- [x] Consolidated error handling and results
- [x] Support dry-run mode for all platforms
*/

import XPoster from './x-poster.js';
import ThreadsPoster from './threads-poster.js';

class MultiPoster {
  constructor(options = {}) {
    const {
      platforms = ['x', 'threads'],
      dryRun = false,
      xOptions = {},
      threadsOptions = {}
    } = options;

    this.dryRun = dryRun;
    this.platforms = Array.isArray(platforms) ? platforms : [platforms];
    this.posters = {};
    this.results = {};

    // Initialize posters for selected platforms
    if (this.platforms.includes('x')) {
      try {
        this.posters.x = new XPoster({ ...xOptions, dryRun });
      } catch (error) {
        if (!dryRun) {
          console.warn(`⚠️ Failed to initialize X poster: ${error.message}`);
        }
      }
    }

    if (this.platforms.includes('threads')) {
      try {
        this.posters.threads = new ThreadsPoster({ ...threadsOptions, dryRun });
      } catch (error) {
        if (!dryRun) {
          console.warn(`⚠️ Failed to initialize Threads poster: ${error.message}`);
        }
      }
    }

    if (Object.keys(this.posters).length === 0 && !dryRun) {
      throw new Error('No valid posters could be initialized. Check your API credentials.');
    }
  }

  /**
   * Validate post content across all platforms
   * @param {string} postText - The post text to validate
   * @returns {Object} Combined validation result
   */
  validatePost(postText) {
    const platformValidations = {};
    let overallValid = true;
    const allErrors = [];

    for (const [platform, poster] of Object.entries(this.posters)) {
      const validation = poster.validatePost(postText);
      platformValidations[platform] = validation;
      
      if (!validation.isValid) {
        overallValid = false;
        allErrors.push(...validation.errors.map(err => `${platform.toUpperCase()}: ${err}`));
      }
    }

    return {
      isValid: overallValid,
      errors: allErrors,
      platformValidations,
      length: postText ? postText.length : 0
    };
  }

  /**
   * Test API credentials for all platforms
   * @returns {Promise<Object>} Test results for all platforms
   */
  async testCredentials() {
    const testResults = {};

    if (this.dryRun) {
      for (const platform of Object.keys(this.posters)) {
        testResults[platform] = {
          success: true,
          dryRun: true,
          message: 'Dry run mode - credentials not tested'
        };
      }
      return testResults;
    }

    for (const [platform, poster] of Object.entries(this.posters)) {
      console.log(`🔐 Testing ${platform.toUpperCase()} API credentials...`);
      
      try {
        const result = platform === 'x' 
          ? await poster.getAccountInfo()
          : await poster.getUserInfo();
        
        testResults[platform] = result;
        
        if (!result.success) {
          console.error(`❌ Failed to connect to ${platform.toUpperCase()} API:`, result.error);
        }
      } catch (error) {
        console.error(`💥 Error testing ${platform.toUpperCase()} credentials:`, error.message);
        testResults[platform] = {
          success: false,
          error: error.message || error
        };
      }
    }

    return testResults;
  }

  /**
   * Publish post to all configured platforms
   * @param {string} postText - The post text to publish
   * @param {Object} options - Publishing options
   * @returns {Promise<Object>} Combined results from all platforms
   */
  async publishPost(postText, options = {}) {
    const { 
      validateOnly = false,
      skipCredentialTest = false 
    } = options;

    // Validate post content
    const validation = this.validatePost(postText);
    
    if (!validation.isValid) {
      console.error('❌ Post validation failed for some platforms:', validation.errors);
      return {
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        postText,
        platformValidations: validation.platformValidations
      };
    }
    
    console.log(`📝 Post validation passed for all platforms: ${validation.length} characters`);
    
    if (validateOnly) {
      return {
        success: true,
        validated: true,
        postText,
        length: validation.length,
        platformValidations: validation.platformValidations
      };
    }

    // Test credentials if not skipped and not in dry-run mode
    if (!skipCredentialTest && !this.dryRun) {
      const credentialTests = await this.testCredentials();
      
      // Remove posters with failed credentials
      for (const [platform, testResult] of Object.entries(credentialTests)) {
        if (!testResult.success) {
          console.log(`⚠️ Removing ${platform.toUpperCase()} due to credential failure`);
          delete this.posters[platform];
        }
      }
      
      if (Object.keys(this.posters).length === 0) {
        return {
          success: false,
          error: 'No valid API connections available',
          credentialTests
        };
      }
    }

    // Publish to all platforms
    const results = {};
    
    for (const [platform, poster] of Object.entries(this.posters)) {
      console.log(`📤 Publishing post to ${platform.toUpperCase()}...`);
      
      try {
        const publishResult = await poster.publishPost(postText);
        results[platform] = publishResult;
        
        if (publishResult.success) {
          if (publishResult.dryRun) {
            console.log(`✅ ${platform.toUpperCase()} DRY RUN completed successfully`);
          } else {
            console.log(`🎉 Post published successfully to ${platform.toUpperCase()}!`);
            if (publishResult.url) {
              console.log(`🔗 Post URL: ${publishResult.url}`);
            }
          }
        } else {
          console.error(`❌ Failed to publish to ${platform.toUpperCase()}:`, publishResult.error);
        }
      } catch (error) {
        console.error(`💥 Error publishing to ${platform.toUpperCase()}:`, error.message);
        results[platform] = {
          success: false,
          error: 'Unexpected error',
          details: error.message || error
        };
      }
    }

    // Analyze results
    const successfulPosts = Object.entries(results).filter(([, result]) => result.success);
    const failedPosts = Object.entries(results).filter(([, result]) => !result.success);
    
    const overallSuccess = successfulPosts.length > 0;

    return {
      success: overallSuccess,
      results,
      summary: {
        total: Object.keys(results).length,
        successful: successfulPosts.length,
        failed: failedPosts.length,
        platforms: {
          successful: successfulPosts.map(([platform]) => platform),
          failed: failedPosts.map(([platform]) => platform)
        }
      },
      postText,
      length: validation.length
    };
  }

  /**
   * Get information about available platforms and their status
   * @returns {Object} Platform information
   */
  getPlatformInfo() {
    const info = {
      configured: this.platforms,
      initialized: Object.keys(this.posters),
      dryRun: this.dryRun
    };

    info.missing = this.platforms.filter(platform => !info.initialized.includes(platform));
    
    return info;
  }
}

export default MultiPoster;