/*
TODOs (buzz-analyzer.js)
- [x] Define buzz keywords and weights
- [x] Score by keyword matches
- [x] Add category bonuses and numeric patterns
- [x] Extract suggested hashtags
- [x] Export analyzeBuzzPotential
*/

function normalizeText(text = '') {
  if (!text) return '';

  const normalized = String(text)
    .normalize('NFKC') // 全角半角・記号の互換分解を実施
    .toLowerCase(); // 英字を小文字化

  const unifiedPunctuation = normalized
    .replace(/[‐‑‒–—―]/g, '-') // ハイフン系を統一
    .replace(/[“”«»‟‟]/g, '"') // ダブルクォーテーション系を統一
    .replace(/[‘’‚‛‹›]/g, "'"); // シングルクォーテーション系を統一

  return unifiedPunctuation.replace(/\s+/g, ' ').trim(); // 連続空白を1つにまとめてトリム
}

export function analyzeBuzzPotential(article) {
  const { title = '', contentSnippet = '', category } = article;

  const normalizedTitle = normalizeText(title);
  const normalizedContent = normalizeText(contentSnippet);

  const buzzKeywords = {
    ai: ['ChatGPT', 'AI', '人工知能', '生成AI', 'Claude', 'GPT', 'OpenAI', '機械学習', 'LLM'],
    business: ['株価', '上場', '買収', 'IPO', '投資', '資金調達', 'バブル', '破綻', 'M&A'],
    shock: ['速報', '緊急', '驚愕', '衝撃', '大炎上', '大混乱', '緊急事態', '異例'],
    trend: ['話題', 'バズ', 'トレンド', '注目', '急上昇', '人気', 'ヒット'],
    money: ['億円', '兆円', '給料', '年収', '価格', '暴落', '急騰', '最高値']
  };

  let buzzScore = 0;
  const matchedKeywords = [];

  for (const [type, keywords] of Object.entries(buzzKeywords)) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedTitle.includes(normalizedKeyword) || normalizedContent.includes(normalizedKeyword)) {
        buzzScore += type === 'shock' ? 3 : type === 'ai' ? 2 : 1;
        matchedKeywords.push(keyword);
      }
    }
  }

  if (category === 'ai') buzzScore += 2;
  if (category === 'business') buzzScore += 1;

  if (/\d+([億兆]円|%|倍)/.test(`${normalizedTitle}${normalizedContent}`)) {
    buzzScore += 2;
  }

  const trendingTopics = extractHashtags(title, matchedKeywords);

  return {
    ...article,
    buzzScore,
    matchedKeywords,
    trendingTopics
  };
}

function extractHashtags(title, keywords) {
  const hashtags = [];

  hashtags.push('#AI');

  if (keywords.includes('ChatGPT')) hashtags.push('#ChatGPT');
  if (keywords.includes('投資')) hashtags.push('#投資');
  if (keywords.includes('株価')) hashtags.push('#株価');
  if (keywords.includes('速報')) hashtags.push('#速報');

  if (title.includes('ビジネス')) hashtags.push('#ビジネス');
  if (title.includes('テック')) hashtags.push('#テック');

  return Array.from(new Set(hashtags)).slice(0, 3);
}

export default analyzeBuzzPotential;
