/*
TODOs (scripts/post.js)
- [x] Import generate function from generate-tweet.js
- [x] Publish to X using XPoster
- [x] Publish to Threads using ThreadsPoster
- [x] Save post to file for backup
- [x] Add comprehensive error handling
- [x] Support dry-run mode
- [x] Support platform selection (X, Threads, or both)
*/

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateOpinionPost } from './generate-tweet.js';
import XPoster from '../lib/x-poster.js';
import ThreadsPoster from '../lib/threads-poster.js';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDirectoryExists(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

function formatTimestamp(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

async function savePostBackup(postText, results, timestamp) {
  try {
    const backupDir = path.resolve(__dirname, '..', 'posts');
    await ensureDirectoryExists(backupDir);
    
    const filename = `post-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      postText,
      results,
      metadata: {
        length: postText.length,
        platforms: Object.keys(results),
        posted: Object.values(results).some(r => r.success && !r.dryRun),
        dryRun: Object.values(results).every(r => r.dryRun || false)
      }
    };
    
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`📁 Post backup saved: ${filepath}`);
    
    return filepath;
  } catch (error) {
    console.error('⚠️ Failed to save post backup:', error.message);
    return null;
  }
}

async function main() {
  const timestamp = formatTimestamp();
  console.log(`🚀 Starting post generation and publishing process at ${timestamp}`);
  
  try {
    // Check if we should run in dry-run mode
    const dryRun = process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
    
    // Check which platforms to post to
    const platforms = [];
    if (process.argv.includes('--x-only')) {
      platforms.push('x');
    } else if (process.argv.includes('--threads-only')) {
      platforms.push('threads');
    } else {
      // Default: post to both platforms
      platforms.push('x', 'threads');
    }
    
    if (dryRun) {
      console.log(`🔄 Running in DRY RUN mode - no posts will be published to: ${platforms.join(', ')}`);
    } else {
      console.log(`📤 Will publish to platforms: ${platforms.join(', ')}`);
    }
    
    // 1. Generate opinion post using generate-tweet.js
    console.log('✍️ Generating opinion post...');
    const result = await generateOpinionPost();
    
    const { postText, article: topArticle, metadata } = result;
    
    console.log(`🎯 Selected article: "${metadata.title}" (buzz score: ${metadata.buzzScore})`);
    console.log(`📊 Matched keywords: ${metadata.matchedKeywords.join(', ')}`);
    
    console.log('✅ Post generated successfully:');
    console.log('━'.repeat(50));
    console.log(postText);
    console.log('━'.repeat(50));
    
    // 2. Initialize posters based on selected platforms
    const posters = {};
    const results = {};
    
    if (platforms.includes('x')) {
      posters.x = new XPoster({ dryRun });
    }
    
    if (platforms.includes('threads')) {
      posters.threads = new ThreadsPoster({ dryRun });
    }
    
    // 3. Test credentials (if not in dry-run mode)
    if (!dryRun) {
      for (const [platform, poster] of Object.entries(posters)) {
        console.log(`🔐 Testing ${platform.toUpperCase()} API credentials...`);
        
        const accountInfo = platform === 'x' 
          ? await poster.getAccountInfo()
          : await poster.getUserInfo();
        
        if (!accountInfo.success) {
          console.error(`❌ Failed to connect to ${platform.toUpperCase()} API:`, accountInfo.error);
          console.log(`⚠️ Continuing with other platforms...`);
          delete posters[platform];
        }
      }
      
      if (Object.keys(posters).length === 0) {
        console.error('❌ No valid API connections available');
        process.exit(1);
      }
    }
    
    // 4. Publish the post to all platforms
    for (const [platform, poster] of Object.entries(posters)) {
      console.log(`📤 Publishing post to ${platform.toUpperCase()}...`);
      const publishResult = await poster.publishPost(postText);
      results[platform] = publishResult;
      
      if (publishResult.success) {
        if (publishResult.dryRun) {
          console.log(`✅ ${platform.toUpperCase()} DRY RUN completed successfully`);
        } else {
          console.log(`🎉 Post published successfully to ${platform.toUpperCase()}!`);
          console.log(`🔗 Post URL: ${publishResult.url}`);
        }
      } else {
        console.error(`❌ Failed to publish to ${platform.toUpperCase()}:`, publishResult.error);
      }
    }
    
    // 5. Save backup regardless of publish results
    const backupPath = await savePostBackup(postText, results, timestamp);
    
    // 6. Handle results
    const successfulPosts = Object.entries(results).filter(([, result]) => result.success);
    const failedPosts = Object.entries(results).filter(([, result]) => !result.success);
    
    if (successfulPosts.length > 0) {
      console.log(`✅ Successfully posted to ${successfulPosts.length}/${Object.keys(results).length} platforms:`);
      successfulPosts.forEach(([platform, result]) => {
        if (result.dryRun) {
          console.log(`  - ${platform.toUpperCase()}: DRY RUN completed`);
        } else {
          console.log(`  - ${platform.toUpperCase()}: ${result.url}`);
        }
      });
      console.log(`📁 Backup saved: ${backupPath}`);
    }
    
    if (failedPosts.length > 0) {
      console.error(`❌ Failed to post to ${failedPosts.length}/${Object.keys(results).length} platforms:`);
      failedPosts.forEach(([platform, result]) => {
        console.error(`  - ${platform.toUpperCase()}: ${result.error} - ${result.details}`);
        
        if (result.error === 'Rate limited') {
          console.log(`    ⏰ Rate limited on ${platform.toUpperCase()}. Try again later.`);
          if (result.retryAfter) {
            console.log(`    ⏰ Retry after: ${new Date(result.retryAfter * 1000)}`);
          }
        }
      });
      
      if (successfulPosts.length === 0) {
        console.log(`📁 Post content saved to backup: ${backupPath}`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('💥 Script error:', error.message || error);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
  
  console.log('✅ Process completed successfully');
  process.exit(0);
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Process terminated');
  process.exit(0);
});

main().catch((error) => {
  console.error('💥 Unhandled error:', error.message || error);
  console.error('📋 Stack trace:', error.stack);
  process.exit(1);
});