import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchTrendingNews } from './fetcher.js';
import { analyzeBuzzPotential } from './analyzer.js';
import { generateFromTweet } from './generator.js';
import MultiPoster from '../../shared/posters/multi-poster.js';
import SlackPoster from '../../shared/posters/slack-poster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NewsWorkflow {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.platforms = options.platforms || ['x', 'threads'];
  }

  async run() {
    console.log('🚀 Starting news workflow...');

    // 1. Fetch & Analyze
    console.log('📰 Fetching trending news...');
    const articles = await fetchTrendingNews();
    if (!articles || articles.length === 0) {
      throw new Error('No articles fetched');
    }

    const analyzed = articles.map(analyzeBuzzPotential);
    const topArticle = analyzed.sort((a, b) => b.buzzScore - a.buzzScore)[0];
    
    console.log(`🎯 Selected article: "${topArticle.title}" (buzz score: ${topArticle.buzzScore})`);
    console.log(`📊 Matched keywords: ${topArticle.matchedKeywords?.join(', ') || 'none'}`);

    // 2. Generate
    console.log('✍️ Generating post content...');
    const postText = await generateFromTweet(topArticle);
    
    console.log('✅ Post generated successfully:');
    console.log('━'.repeat(50));
    console.log(postText);
    console.log('━'.repeat(50));

    // 3. Post
    console.log(`🚀 Initializing multi-poster for: ${this.platforms.join(', ')}`);
    const multiPoster = new MultiPoster({
      platforms: this.platforms,
      dryRun: this.dryRun
    });

    // publishPost returns { success, results, summary, ... }
    const result = await multiPoster.publishPost(postText);

    // 4. Slack Notification
    if (process.env.SLACK_WEBHOOK_URL) {
      console.log('📨 Sending draft to Slack for review...');
      const slack = new SlackPoster();
      await slack.publishPost(postText, {
        articleTitle: topArticle.title,
        type: 'news'
      });
    }

    // 5. Backup
    await this.saveBackup(postText, result, topArticle);

    return {
      postText,
      article: topArticle,
      result
    };
  }

  async saveBackup(postText, result, article) {
    try {
      // プロジェクトルートのpostsディレクトリを見つける（src/features/news/から3つ上）
      const backupDir = path.resolve(__dirname, '..', '..', '..', 'posts');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = this.formatTimestamp();
      const filename = `news-post-${timestamp}.json`;
      const filepath = path.join(backupDir, filename);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        type: 'news',
        postText,
        article: {
            title: article.title,
            source: article.source,
            url: article.link,
            buzzScore: article.buzzScore,
            matchedKeywords: article.matchedKeywords
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
