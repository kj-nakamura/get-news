/*
TODOs (api/generate-post.js)
- [x] Fetch news and analyze buzz
- [x] Generate tweet text
- [x] Post to X and Threads via multi-poster (dry-run if missing creds)
- [x] Return JSON result with both platforms
*/

import { fetchTrendingNews } from '../lib/news-fetcher.js';
import { analyzeBuzzPotential } from '../lib/buzz-analyzer.js';
import { generateTweet } from '../lib/tweet-generator.js';
import MultiPoster from '../lib/multi-poster.js';

export default async function handler(req, res) {
  try {
    // Vercel cronからの呼び出しかチェック
    const isFromCron = req.headers['user-agent']?.includes('vercel-cron') || 
                      req.headers['x-vercel-cron'] ||
                      process.env.VERCEL_CRON === 'true';

    // 手動呼び出しの場合は認証チェック
    if (!isFromCron) {
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
    }

    // 1. Fetch news once and generate single post content
    console.log('📰 Fetching trending news...');
    const articles = await fetchTrendingNews();
    const analyzedArticles = articles.map(analyzeBuzzPotential);

    if (analyzedArticles.length === 0) {
      res.status(200).json({ success: false, reason: 'NO_ARTICLES' });
      return;
    }

    const topArticle = analyzedArticles.sort((a, b) => b.buzzScore - a.buzzScore)[0];
    console.log(`🎯 Selected article: "${topArticle.title}" (buzz score: ${topArticle.buzzScore})`);
    
    // 2. Generate post content once (will be used for both X and Threads)
    console.log('✍️ Generating post content...');
    const postText = await generateTweet(topArticle);
    console.log(`📝 Generated post: ${postText.length} characters`);

    // 上でisFromCronは既にチェック済み

    // Check which platforms to post to based on query parameters
    const platformParam = req.query.platforms || 'both';
    let platforms = ['x', 'threads'];
    
    if (platformParam === 'x') {
      platforms = ['x'];
    } else if (platformParam === 'threads') {
      platforms = ['threads'];
    }

    console.log(`📤 Will post to platforms: ${platforms.join(', ')}`);
    console.log(`📝 Same content will be used for all selected platforms`);

    if (!isFromCron) {
      console.log('Manual API call detected. Running in dry-run mode.');
      res.status(200).json({ 
        success: true, 
        postText, 
        platforms,
        dryRun: true, 
        reason: 'MANUAL_CALL',
        article: {
          title: topArticle.title,
          buzzScore: topArticle.buzzScore,
          source: topArticle.source
        }
      });
      return;
    }

    // Check credentials for selected platforms
    const xCreds = {
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET
    };

    const threadsCreds = {
      accessToken: process.env.THREADS_ACCESS_TOKEN,
      userId: process.env.THREADS_USER_ID
    };

    const hasXCreds = Object.values(xCreds).every(Boolean);
    const hasThreadsCreds = Object.values(threadsCreds).every(Boolean);

    // Filter platforms based on available credentials
    const availablePlatforms = [];
    if (platforms.includes('x') && hasXCreds) {
      availablePlatforms.push('x');
    }
    if (platforms.includes('threads') && hasThreadsCreds) {
      availablePlatforms.push('threads');
    }

    if (availablePlatforms.length === 0) {
      console.warn('Missing credentials for all selected platforms. Running in dry-run mode.');
      res.status(200).json({ 
        success: true, 
        postText, 
        platforms,
        dryRun: true, 
        reason: 'MISSING_CREDENTIALS',
        missingCreds: {
          x: !hasXCreds,
          threads: !hasThreadsCreds
        }
      });
      return;
    }

    try {
      // 3. Initialize multi-poster with available platforms
      console.log(`🚀 Initializing multi-poster for: ${availablePlatforms.join(', ')}`);
      const multiPoster = new MultiPoster({
        platforms: availablePlatforms,
        dryRun: false,
        xOptions: xCreds,
        threadsOptions: threadsCreds
      });

      // 4. Publish the same content to all available platforms
      console.log(`📤 Publishing same content to ${availablePlatforms.length} platform(s)...`);
      const result = await multiPoster.publishPost(postText, {
        skipCredentialTest: true // We already checked credentials
      });

      console.log(`✅ Published to ${result.summary.successful}/${result.summary.total} platforms`);

      // Format response
      const response = {
        success: result.success,
        postText,
        platforms: availablePlatforms,
        results: result.results,
        summary: result.summary,
        article: {
          title: topArticle.title,
          buzzScore: topArticle.buzzScore,
          source: topArticle.source,
          matchedKeywords: topArticle.matchedKeywords
        }
      };

      // Include post URLs if available
      if (result.results.x?.success) {
        response.xUrl = result.results.x.url;
        response.xId = result.results.x.id;
      }

      if (result.results.threads?.success) {
        response.threadsUrl = result.results.threads.url;
        response.threadsId = result.results.threads.id;
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('Multi-poster error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        postText,
        platforms: availablePlatforms
      });
    }
  } catch (error) {
    console.error('generate-post handler error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
