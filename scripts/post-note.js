import dotenv from 'dotenv';
import { NoteWorkflow } from '../src/features/note/workflow.js';

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    // Default to dry-run (draft mode) unless --publish is specified
    // "Xに下書き投稿したい"という要件に対応するため、基本は投稿せずにコンソール出力/ファイル保存のみ行う
    const shouldPublish = process.argv.includes('--publish');
    const dryRun = !shouldPublish;
    
    // Check which platforms to post to
    const platforms = [];
    if (process.argv.includes('--threads-only')) {
      platforms.push('threads');
    } else if (process.argv.includes('--both')) {
      platforms.push('x', 'threads');
    } else {
      // Default: post to X only as per requirement
      platforms.push('x');
    }
    
    console.log('📝 Note Article Post Generator');
    if (dryRun) {
      console.log(`🔄 Running in DRAFT mode (Dry Run). Content will be generated but NOT posted.`);
      console.log(`   To publish, run with --publish flag.`);
    } else {
      console.log(`⚠️ LIVE MODE: Will publish to ${platforms.join(', ')}`);
    }
    
    const workflow = new NoteWorkflow({
      dryRun,
      platforms
    });

    const { result } = await workflow.run();
    
    const { summary } = result;

    if (!summary) {
       console.error('❌ Workflow failed without summary (likely validation error)');
       if (result.error) console.error(`Error: ${result.error}`);
       if (result.details) console.error(`Details: ${result.details}`);
       process.exit(1);
    }

    if (dryRun) {
        console.log('✅ Draft created successfully.');
        process.exit(0);
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

main().catch((error) => {
  console.error('💥 Unhandled error:', error.message || error);
  process.exit(1);
});
