import { NewsWorkflow } from '../src/features/news/workflow.js';
import { NoteWorkflow } from '../src/features/note/workflow.js';
import dotenv from 'dotenv';

dotenv.config();

async function simulateGithubAction() {
  console.log('🏁 Starting GitHub Actions Simulation (Workflow Dispatch)...');
  console.log('--------------------------------------------------');

  // Step 1: Post News (Twice a day job)
  console.log('\n[JOB 1] Post News (Slack Notification Only)');
  try {
    const newsWorkflow = new NewsWorkflow({ dryRun: true }); // Dry run doesn't matter for news anymore as it only slacks
    await newsWorkflow.run();
    console.log('✅ News Job Completed.');
  } catch (err) {
    console.error('❌ News Job Failed:', err);
  }

  console.log('\n--------------------------------------------------');

  // Step 2: Post Note Draft (Once a day job)
  console.log('\n[JOB 2] Post Note Draft (Gemini Gen + Slack)');
  try {
    const noteWorkflow = new NoteWorkflow({ dryRun: true });
    await noteWorkflow.run();
    console.log('✅ Note Job Completed.');
  } catch (err) {
    console.error('❌ Note Job Failed:', err);
  }

  console.log('\n--------------------------------------------------');
  console.log('🏁 Simulation Completed.');
}

simulateGithubAction();
