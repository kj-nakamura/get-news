import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchNoteArticleTitles } from './fetcher.js';
import { generateNoteTweet } from './generator.js';
import MultiPoster from '../../shared/posters/multi-poster.js';
import SlackPoster from '../../shared/posters/slack-poster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NoteWorkflow {
  constructor(options = {}) {
    // Default to dry-run=true if not strictly specified as false
    // This aligns with the "draft post" requirement
    this.dryRun = options.dryRun !== false; 
    this.platforms = options.platforms || ['x'];
    this.noteUrl = options.noteUrl || process.env.NOTE_TARGET_URL || 'https://note.com/ceotama';
  }

  async run() {
    console.log('🚀 Starting Note workflow...');

    // 1. Fetch
    console.log(`Checking Note articles from: ${this.noteUrl}`);
    const titles = await fetchNoteArticleTitles(this.noteUrl);
    
    if (!titles || titles.length === 0) {
      throw new Error('No titles found or failed to fetch from Note');
    }

    // Pick the latest one (assuming the first one is the latest)
    const latestTitle = titles[0];
    console.log(`🎯 Selected article title: "${latestTitle}"`);

    // 2. Generate
    console.log('✍️ Generating post content...');
    const postText = await generateNoteTweet(latestTitle);
    
    console.log('✅ Post generated successfully:');
    console.log('━'.repeat(50));
    console.log(postText);
    console.log('━'.repeat(50));

    // 3. Post
    // The requirement is "draft post to X". 
    // Since X API doesn't support real drafts, we use dry-run or actual post depending on config.
    // If dryRun is true, MultiPoster will just log it.
    console.log(`🚀 Initializing multi-poster for: ${this.platforms.join(', ')}`);
    const multiPoster = new MultiPoster({
      platforms: this.platforms,
      dryRun: this.dryRun
    });

    const result = await multiPoster.publishPost(postText);

    // 4. Slack Notification (New: As a draft review)
    if (process.env.SLACK_WEBHOOK_URL) {
      console.log('📨 Sending draft to Slack for review...');
      const slack = new SlackPoster();
      await slack.publishPost(postText, {
        articleTitle: latestTitle,
        type: 'note'
      });
    }

    // 5. Backup
    await this.saveBackup(postText, result, latestTitle);

    return {
      postText,
      articleTitle: latestTitle,
      result
    };
  }

  async saveBackup(postText, result, title) {
    try {
      const backupDir = path.resolve(__dirname, '..', '..', '..', 'posts');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = this.formatTimestamp();
      const filename = `note-post-${timestamp}.json`;
      const filepath = path.join(backupDir, filename);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        type: 'note',
        postText,
        article: {
            title: title,
            source: 'note.com',
            url: this.noteUrl
        },
        results: result.results,
        metadata: {
          length: postText.length,
          platforms: this.platforms,
          posted: result.success && !this.dryRun,
          dryRun: this.dryRun
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

  formatTimestamp(date = new Date()) {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
  }
}
