# 無料ポスト生成サービス設計書

## システム概要
1日1回、関連ニュースを取得してバズりそうなツイートを自動生成・投稿するサービス

## アーキテクチャ

### 1. データ取得層（完全無料）

#### AI関連フィード
```javascript
const AI_FEEDS = [
  'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',        // ITmedia AI+
  'https://feeds.japan.zdnet.com/rss/zdnet/all.rdf',     // ZDNet Japan
  'https://zenn.dev/topics/ai/feed',                     // Zenn AI記事
  'https://zenn.dev/topics/生成ai/feed',                 // Zenn 生成AI記事
  'https://zenn.dev/topics/llm/feed',                    // Zenn LLM記事
];
```

#### ビジネス・お金関連フィード
```javascript
const BUSINESS_FEEDS = [
  'https://business.nikkei.com/rss/sns/nb.rdf',          // 日経ビジネス電子版
  'https://www.businessinsider.jp/feed/index.xml',       // Business Insider Japan
  'https://toyokeizai.net/list/feed/rss',               // 東洋経済オンライン
  'https://diamond.jp/list/feed/rss',                   // ダイヤモンドオンライン
  'https://gendai.media/feed',                          // 現代ビジネス
];
```

#### テック系フィード
```javascript
const TECH_FEEDS = [
  'https://xtech.nikkei.com/rss/xtech-it.rdf',          // 日経クロステック
  'https://www.itmedia.co.jp/news/rss/index.rdf',      // ITmedia NEWS
  'https://feeds.feedburner.com/hatena/b/hotentry/it',  // はてブ IT
  'https://jp.techcrunch.com/feed/',                    // TechCrunch Japan（※終了済み）
];
```

**メリット:** APIキー不要、制限なし、リアルタイム更新、バズりやすい話題が豊富

### 2. AI分析層（無料枠活用）

#### Gemini API
- **無料枠:** 月15リクエスト/分、100万トークン/日
- **コスト:** 完全無料（制限内）
- **月間処理可能:** 無制限（制限内）

### 3. 投稿層
```
X API Free Plan
├── 月間500ポスト
├── 1日17ポスト
└── 月額$0
```

```
X(Twitter)でURLを追加する場合の文字数カウントについて説明します。
URLは投稿文に含まれる文字数として一律23文字（半角）としてカウントされます。これは全角換算で11.5文字に相当します。 QiitaDigital-farm
重要な点は以下の通りです：
URLの文字数カウントルール

URLの実際の長さに関係なく、すべて一律23文字（半角）でカウント QiitaApplipo
長いURLでも短いURLでも、文字数への影響は常に一定 X（旧ツイッター)でURLの投稿時に文字数カウントってどうなるんだろう？ | （株）デジタルファーム
これは内部的にt.coという短縮リンクに自動変換されるため X(Twitter)の文字数制限とURLの処理 #Twitter - Qiita

実際の例

無料ユーザー（280文字制限）の場合：URLを1つ含むと実質的に使える文字数は257文字（280 - 23 = 257）
全角140文字制限の場合：URLを含むと実質128.5文字程度が利用可能
```

### 4. インフラ層（無料枠）

#### Option A: Vercel（推奨）
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/generate-post",
      "schedule": "0 9 * * *"
    }
  ]
}
```
- **無料枠:** 100GB-hours/月、1,000回実行/月
- **サーバーレス:** 自動スケーリング

## 実装例

### 1. RSS解析 + AI生成（改良版）
```javascript
// lib/news-fetcher.js
import Parser from 'rss-parser';

const FEED_CATEGORIES = {
  ai: [
    'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml',
    'https://zenn.dev/topics/ai/feed',
    'https://zenn.dev/topics/生成ai/feed',
  ],
  business: [
    'https://business.nikkei.com/rss/sns/nb.rdf',
    'https://www.businessinsider.jp/feed/index.xml',
    'https://toyokeizai.net/list/feed/rss',
  ],
  tech: [
    'https://xtech.nikkei.com/rss/xtech-it.rdf',
    'https://feeds.feedburner.com/hatena/b/hotentry/it',
  ]
};

export async function fetchTrendingNews() {
  const parser = new Parser();
  const allArticles = [];
  
  // 各カテゴリからニュースを取得
  for (const [category, feeds] of Object.entries(FEED_CATEGORIES)) {
    for (const feedUrl of feeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        const articles = feed.items.slice(0, 3).map(item => ({
          ...item,
          category,
          source: feed.title,
          pubDate: new Date(item.pubDate)
        }));
        allArticles.push(...articles);
      } catch (error) {
        console.error(`Feed parse error for ${feedUrl}:`, error);
      }
    }
  }
  
  // 最新順でソート、重複除去
  return allArticles
    .sort((a, b) => b.pubDate - a.pubDate)
    .filter((article, index, arr) => 
      arr.findIndex(a => a.title === article.title) === index
    )
    .slice(0, 10);
}
```

### 2. バズり要素分析（強化版）
```javascript
// lib/buzz-analyzer.js
export function analyzeBuzzPotential(article) {
  const { title, contentSnippet = '', category } = article;
  
  const buzzKeywords = {
    ai: ['ChatGPT', 'AI', '人工知能', '生成AI', 'Claude', 'GPT', 'OpenAI', '機械学習', 'LLM'],
    business: ['株価', '上場', '買収', 'IPO', '投資', '資金調達', 'バブル', '破綻', 'M&A'],
    shock: ['速報', '緊急', '驚愕', '衝撃', '大炎上', '大混乱', '緊急事態', '異例'],
    trend: ['話題', 'バズ', 'トレンド', '注目', '急上昇', '人気', 'ヒット'],
    money: ['億円', '兆円', '給料', '年収', '価格', '暴落', '急騰', '最高値']
  };
  
  let buzzScore = 0;
  const matchedKeywords = [];
  
  // キーワードマッチング
  Object.entries(buzzKeywords).forEach(([type, keywords]) => {
    keywords.forEach(keyword => {
      if (title.includes(keyword) || contentSnippet.includes(keyword)) {
        buzzScore += type === 'shock' ? 3 : type === 'ai' ? 2 : 1;
        matchedKeywords.push(keyword);
      }
    });
  });
  
  // カテゴリボーナス
  if (category === 'ai') buzzScore += 2;
  if (category === 'business') buzzScore += 1;
  
  // 数値の存在チェック（金額、パーセンテージなど）
  if (/\d+([億兆]円|%|倍)/.test(title + contentSnippet)) {
    buzzScore += 2;
  }
  
  return {
    ...article,
    buzzScore,
    matchedKeywords,
    trendingTopics: extractHashtags(title, matchedKeywords)
  };
}

function extractHashtags(title, keywords) {
  const hashtags = [];
  
  // 固定ハッシュタグ
  hashtags.push('#AI');
  
  // キーワードベースのハッシュタグ
  if (keywords.includes('ChatGPT')) hashtags.push('#ChatGPT');
  if (keywords.includes('投資')) hashtags.push('#投資');
  if (keywords.includes('株価')) hashtags.push('#株価');
  if (keywords.includes('速報')) hashtags.push('#速報');
  
  // カテゴリベース
  if (title.includes('ビジネス')) hashtags.push('#ビジネス');
  if (title.includes('テック')) hashtags.push('#テック');
  
  return [...new Set(hashtags)].slice(0, 3);
}
```

### 3. AI生成プロンプト最適化（バズ特化）
```javascript
// lib/tweet-generator.js
export async function generateTweet(article) {
  const { title, contentSnippet, matchedKeywords, trendingTopics, category, source } = article;
  
  const prompt = `
あなたはバズるツイートを生成する専門家です。以下のニュースから、リツイート・いいねが集まりそうなツイートを作成してください。

【ニュース情報】
カテゴリ: ${category.toUpperCase()}
タイトル: ${title}
内容: ${contentSnippet}
出典: ${source}
注目キーワード: ${matchedKeywords.join(', ')}

【ツイート作成ルール】
✅ 140文字以内（必須）
✅ 感情を動かす表現を使用
✅ 数字や具体的な事実を含める
✅ 疑問形や呼びかけで参加を促す
✅ 絵文字を効果的に使用（2-3個）
✅ ハッシュタグを2-3個含める

【バズる要素】
🔥 驚き・衝撃
💡 学びや気づき
🤔 議論を呼ぶ内容
📈 将来性への期待

【ツイート例（参考）】
🚨AI業界に激震🚨
ChatGPTを超える新技術が登場！
これまでの常識が覆される可能性も...

みんなはどう思う？🤔
#AI革命 #テック業界 #未来

【出力形式】
ツイート本文のみを出力してください。説明文は不要です。
`;

  // Gemini API（無料）を使用
  const response = await callGeminiAPI(prompt);
  
  // ハッシュタグが不足していれば追加
  let finalTweet = response;
  if (!finalTweet.includes('#')) {
    const suggestedTags = trendingTopics.slice(0, 2).join(' ');
    finalTweet += ` ${suggestedTags}`;
  }
  
  // 140文字チェック
  if (finalTweet.length > 140) {
    finalTweet = finalTweet.substring(0, 137) + '...';
  }
  
  return finalTweet;
}

async function callGeminiAPI(prompt) {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.8
        }
      })
    });
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    return generateFallbackTweet(article);
  }
}

function generateFallbackTweet({ title, category }) {
  const templates = [
    `🚨注目🚨 ${title.substring(0, 80)}... これは見逃せない！ #${category} #話題`,
    `💡新発見💡 ${title.substring(0, 70)}... 皆はどう思う？🤔 #${category} #トレンド`,
    `📈速報📈 ${title.substring(0, 75)}... 要チェック！ #${category} #ニュース`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}
```

### 4. 自動投稿システム
```javascript
// api/generate-post.js
import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  try {
    // 1. ニュース取得
    const articles = await fetchTrendingNews();
    
    // 2. バズり度分析
    const analyzedArticles = articles.map(analyzeBuzzPotential);
    const topArticle = analyzedArticles.sort((a, b) => b.buzzScore - a.buzzScore)[0];
    
    // 3. ツイート生成
    const tweet = await generateTweet(topArticle);
    
    // 4. X投稿
    const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    await client.v2.tweet(tweet);
    
    res.json({ success: true, tweet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## 月間運用コスト試算

| 項目 | 無料枠 | 超過時コスト |
|------|--------|--------------|
| RSS取得 | 完全無料 | - |
| Gemini API | 完全無料 | $0.001/1Kトークン |
| X API | 完全無料 | - |
| Vercel | 完全無料 | $20/月〜 |
| **合計** | **$0** | **$0-20** |

## 拡張機能（有料化時）

### 1. 高度なAI分析（月$5-10）
- センチメント分析
- トレンド予測
- 競合分析

### 2. 複数投稿（X API Basic: $200/月）
- 1日複数回投稿
- リプライ自動化
- フォロワー分析

### 3. 分析ダッシュボード
- 投稿パフォーマンス追跡
- エンゲージメント分析
- A/Bテスト機能

## セキュリティ対策

```javascript
// 環境変数管理
process.env.TWITTER_API_KEY
process.env.TWITTER_API_SECRET  
process.env.GEMINI_API_KEY

// レート制限対策
const rateLimiter = {
  lastRequest: null,
  minInterval: 60000, // 1分間隔
  
  async waitIfNeeded() {
    const now = Date.now();
    if (this.lastRequest && now - this.lastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - (now - this.lastRequest))
      );
    }
    this.lastRequest = Date.now();
  }
};
```

## 運用開始手順

1. **GitHubリポジトリ作成**
2. **Vercelにデプロイ**
3. **X Developer登録 & API取得**
4. **Gemini API取得**
5. **環境変数設定**
6. **Cron設定**
7. **テスト実行**

この設計なら完全無料で月30投稿まで可能で、バズりそうなコンテンツを自動生成できます！