import dotenv from 'dotenv';
import { NewsWorkflow } from '../src/features/news/workflow.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
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
    
    const workflow = new NewsWorkflow({
      dryRun,
      platforms
    });

    const { result } = await workflow.run();
    
    // Handle results based on workflow output
    const { summary } = result;

    if (!summary) {
      console.error('❌ Workflow failed without summary (likely validation error)');
      if (result.error) console.error(`Error: ${result.error}`);
      if (result.details) console.error(`Details: ${result.details}`);
      process.exit(1);
    }
    
    if (summary.successful > 0) {
      console.log(`✅ Successfully posted to ${summary.successful}/${summary.total} platforms`);
      process.exit(0);
    } else {
      console.error(`❌ Failed to post to all ${summary.total} platforms`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error.message || error);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
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
