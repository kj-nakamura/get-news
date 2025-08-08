/*
TODOs (news-fetcher.js)
- [x] Define feed categories
- [x] Fetch and parse RSS feeds
- [x] Normalize and merge articles
- [x] Sort and deduplicate
- [x] Expose FEED_CATEGORIES and fetchTrendingNews
*/

import Parser from 'rss-parser';

export const FEED_CATEGORIES = {
  ai: [
    'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
    'https://zenn.dev/topics/ai/feed',
    'https://zenn.dev/topics/生成ai/feed',
    'https://zenn.dev/topics/llm/feed'
  ],
  business: [
    'https://business.nikkei.com/rss/sns/nb.rdf',
    'https://www.businessinsider.jp/feed/index.xml',
    'https://toyokeizai.net/list/feed/rss',
    'https://diamond.jp/list/feed/rss',
    'https://gendai.media/feed'
  ],
  tech: [
    'https://xtech.nikkei.com/rss/xtech-it.rdf',
    'https://www.itmedia.co.jp/news/rss/index.rdf',
    'https://feeds.feedburner.com/hatena/b/hotentry/it'
  ]
};

const parser = new Parser();

export async function fetchTrendingNews(options = {}) {
  const { limitPerFeed = 3, maxArticles = 10 } = options;

  const allArticles = [];

  await Promise.all(
    Object.entries(FEED_CATEGORIES).map(async ([category, feeds]) => {
      await Promise.all(
        feeds.map(async (feedUrl) => {
          try {
            const feed = await parser.parseURL(feedUrl);
            const items = Array.isArray(feed.items) ? feed.items : [];
            const articles = items.slice(0, limitPerFeed).map((item) => {
              const pubDate = parseDate(item.isoDate || item.pubDate);
              return {
                title: item.title || '',
                link: item.link || '',
                contentSnippet: item.contentSnippet || item.content || '',
                category,
                source: feed.title || safeHostname(feedUrl),
                pubDate
              };
            });
            allArticles.push(...articles);
          } catch (error) {
            console.error(`Feed parse error for ${feedUrl}:`, error);
          }
        })
      );
    })
  );

  // Deduplicate by title and sort by latest
  const uniqueByTitle = new Map();
  for (const article of allArticles) {
    if (article.title && !uniqueByTitle.has(article.title)) {
      uniqueByTitle.set(article.title, article);
    }
  }

  return Array.from(uniqueByTitle.values())
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, maxArticles);
}

function parseDate(value) {
  const date = new Date(value || Date.now());
  return isNaN(date.getTime()) ? new Date() : date;
}

function safeHostname(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return 'unknown';
  }
}

export default fetchTrendingNews;
