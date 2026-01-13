import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchTrendingNews } from './fetcher.js';
import { analyzeBuzzPotential } from './analyzer.js';
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

    // 2. Skip Generation & Post
    // Requirement update: Stop Gemini gen & X post for News. Only Slack notification.
    const postText = `📰 *News Pick Up*\n${topArticle.title}\n${topArticle.link}`;
    
    console.log('✅ News selected (No AI generation).');
    console.log(postText);

    // 3. Slack Notification Only
    if (process.env.SLACK_WEBHOOK_URL) {
      console.log('📨 Sending news link to Slack...');
      const slack = new SlackPoster();
      // We pass the raw text directly
      await slack.publishPost(postText, {
        type: 'news'
      });
    }

    return {
      postText,
      article: topArticle,
      result: { success: true, note: 'Slack notification only' }
    };
  }

  // Backup is optional if we are just notifying Slack, but kept for logging if needed
  async saveBackup(postText, result, article) {

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
