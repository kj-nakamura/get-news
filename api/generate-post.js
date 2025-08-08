/*
TODOs (api/generate-post.js)
- [x] Fetch news and analyze buzz
- [x] Generate tweet text
- [x] Post to X via twitter-api-v2 (dry-run if missing creds)
- [x] Return JSON result
*/

import { fetchTrendingNews } from '../lib/news-fetcher.js';
import { analyzeBuzzPotential } from '../lib/buzz-analyzer.js';
import { generateTweet } from '../lib/tweet-generator.js';
import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  try {
    const articles = await fetchTrendingNews();
    const analyzedArticles = articles.map(analyzeBuzzPotential);

    if (analyzedArticles.length === 0) {
      res.status(200).json({ success: false, reason: 'NO_ARTICLES' });
      return;
    }

    const topArticle = analyzedArticles.sort((a, b) => b.buzzScore - a.buzzScore)[0];
    const tweet = await generateTweet(topArticle);

    const creds = {
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET
    };

    const hasAllCreds = Object.values(creds).every(Boolean);

    if (!hasAllCreds) {
      console.warn('Missing Twitter credentials. Skipping post (dry-run).');
      res.status(200).json({ success: true, tweet, dryRun: true });
      return;
    }

    const client = new TwitterApi(creds);
    const result = await client.v2.tweet(tweet);

    res.status(200).json({ success: true, tweet, tweetId: result?.data?.id });
  } catch (error) {
    console.error('generate-post handler error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
