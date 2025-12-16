/*
TODOs (scripts/generate-tweet.js)
- [x] Fetch latest articles
- [x] Score and pick top article
- [x] Generate tweet text (no posting)
- [x] Write tweet to timestamped file under out/
- [x] Load .env file for environment variables
*/

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchTrendingNews } from '../lib/news-fetcher.js';
import { analyzeBuzzPotential } from '../lib/buzz-analyzer.js';
import { generateTweet, getGeminiModelName } from '../lib/tweet-generator.js';

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

export async function generateOpinionPost(options = {}) {
  const {
    saveToFile = false,
    outputDir = 'out',
    filePrefix = 'tweet'
  } = options;
  
  const articles = await fetchTrendingNews();
  if (!Array.isArray(articles) || articles.length === 0) {
    throw new Error('No articles fetched');
  }

  const analyzed = articles.map(analyzeBuzzPotential);
  const top = analyzed.sort((a, b) => b.buzzScore - a.buzzScore)[0];

  const modelName = getGeminiModelName();
  console.log(`Gemini model selected for generation: ${modelName}`);
  const tweet = await generateTweet(top);

  const result = {
    postText: tweet,
    article: top,
    metadata: {
      buzzScore: top.buzzScore,
      matchedKeywords: top.matchedKeywords,
      category: top.category,
      source: top.source,
      title: top.title
    }
  };

  // Only save to file if explicitly requested (for standalone generate command)
  if (saveToFile) {
    const targetDir = path.resolve(__dirname, '..', outputDir);
    await ensureDirectoryExists(targetDir);
    const timestamp = formatTimestamp();
    const outfile = path.join(targetDir, `${filePrefix}-${timestamp}.json`);

    const payload = {
      timestamp: new Date().toISOString(),
      postText: result.postText,
      article: result.article,
      metadata: result.metadata,
      source: 'scripts/generate-tweet.js',
      provider: 'gemini'
    };

    await fs.writeFile(outfile, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Generated post saved: ${outfile}`);
    result.savedFile = outfile;
  }

  return result;
}

async function main() {
  try {
    // When running standalone, save JSON drafts under posts/
    const result = await generateOpinionPost({ 
      saveToFile: true, 
      outputDir: 'posts',
      filePrefix: 'gemini-draft'
    });
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
}
