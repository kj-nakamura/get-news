/*
TODOs (scripts/generate-tweet.js)
- [x] Fetch latest articles
- [x] Score and pick top article
- [x] Generate tweet text (no posting)
- [x] Write tweet to timestamped file under out/
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchTrendingNews } from '../lib/news-fetcher.js';
import { analyzeBuzzPotential } from '../lib/buzz-analyzer.js';
import { generateTweet } from '../lib/tweet-generator.js';

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

async function main() {
  const articles = await fetchTrendingNews();
  if (!Array.isArray(articles) || articles.length === 0) {
    console.error('No articles fetched. Aborting.');
    process.exitCode = 1;
    return;
  }

  const analyzed = articles.map(analyzeBuzzPotential);
  const top = analyzed.sort((a, b) => b.buzzScore - a.buzzScore)[0];

  const tweet = await generateTweet(top);

  const outDir = path.resolve(__dirname, '..', 'out');
  await ensureDirectoryExists(outDir);
  const outfile = path.join(outDir, `tweet-${formatTimestamp()}.txt`);
  await fs.writeFile(outfile, `${tweet}\n`, 'utf8');

  console.log(`Tweet written to: ${outfile}`);
}

main().catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});
