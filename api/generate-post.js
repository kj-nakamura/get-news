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
    // 認証チェック
    const secretToken = process.env.API_SECRET_TOKEN;
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    
    let providedToken = null;
    if (authHeader?.startsWith('Bearer ')) {
      providedToken = authHeader.slice(7);
    } else if (queryToken) {
      providedToken = queryToken;
    }

    // トークンが設定されている場合は認証必須
    if (secretToken && (!providedToken || providedToken !== secretToken)) {
      console.warn('Unauthorized API access attempt');
      res.status(401).json({ success: false, error: 'Unauthorized. Valid token required.' });
      return;
    }

    const articles = await fetchTrendingNews();
    const analyzedArticles = articles.map(analyzeBuzzPotential);

    if (analyzedArticles.length === 0) {
      res.status(200).json({ success: false, reason: 'NO_ARTICLES' });
      return;
    }

    const topArticle = analyzedArticles.sort((a, b) => b.buzzScore - a.buzzScore)[0];
    const tweet = await generateTweet(topArticle);

    // Vercel cronからの呼び出しかチェック (手動実行の場合はdry-run)
    const isFromCron = req.headers['user-agent']?.includes('vercel-cron') || 
                      req.headers['x-vercel-cron'] ||
                      process.env.VERCEL_CRON === 'true';

    if (!isFromCron) {
      console.log('Manual API call detected. Running in dry-run mode.');
      res.status(200).json({ success: true, tweet, dryRun: true, reason: 'MANUAL_CALL' });
      return;
    }

    const creds = {
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET
    };

    const hasAllCreds = Object.values(creds).every(Boolean);

    if (!hasAllCreds) {
      console.warn('Missing X credentials. Skipping post (dry-run).');
      res.status(200).json({ success: true, tweet, dryRun: true, reason: 'MISSING_CREDENTIALS' });
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
