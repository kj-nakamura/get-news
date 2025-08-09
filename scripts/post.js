/*
TODOs (scripts/post.js)
- [x] Import generate function from generate-tweet.js
- [x] Publish to X using XPoster
- [x] Save post to file for backup
- [x] Add comprehensive error handling
- [x] Support dry-run mode
*/

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateOpinionPost } from './generate-tweet.js';
import XPoster from '../lib/x-poster.js';

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

async function savePostBackup(postText, result, timestamp) {
  try {
    const backupDir = path.resolve(__dirname, '..', 'posts');
    await ensureDirectoryExists(backupDir);
    
    const filename = `post-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      postText,
      result,
      metadata: {
        length: postText.length,
        posted: result.success && !result.dryRun,
        dryRun: result.dryRun || false,
        url: result.url || null
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
    if (dryRun) {
      console.log('🔄 Running in DRY RUN mode - no posts will be published to X');
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
    
    // 2. Initialize X poster
    const xPoster = new XPoster({ dryRun });
    
    // 3. Test credentials (if not in dry-run mode)
    if (!dryRun) {
      console.log('🔐 Testing X API credentials...');
      const accountInfo = await xPoster.getAccountInfo();
      
      if (!accountInfo.success) {
        console.error('❌ Failed to connect to X API:', accountInfo.error);
        process.exit(1);
      }
    }
    
    // 4. Publish the post
    console.log('📤 Publishing post to X...');
    const publishResult = await xPoster.publishPost(postText);
    
    // 5. Save backup regardless of publish result
    const backupPath = await savePostBackup(postText, publishResult, timestamp);
    
    // 6. Handle results
    if (publishResult.success) {
      if (publishResult.dryRun) {
        console.log('✅ DRY RUN completed successfully');
        console.log(`📁 Post content saved to backup: ${backupPath}`);
      } else {
        console.log('🎉 Post published successfully to X!');
        console.log(`🔗 Post URL: ${publishResult.url}`);
        console.log(`📁 Backup saved: ${backupPath}`);
      }
    } else {
      console.error('❌ Failed to publish post:', publishResult.error);
      console.error('📋 Details:', publishResult.details);
      
      if (publishResult.error === 'Rate limited') {
        console.log('⏰ Rate limited. Try again later.');
        if (publishResult.retryAfter) {
          console.log(`⏰ Retry after: ${new Date(publishResult.retryAfter * 1000)}`);
        }
      }
      
      console.log(`📁 Post content saved to backup: ${backupPath}`);
      process.exit(1);
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