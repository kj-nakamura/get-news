/*
TODOs (buzz-analyzer.js)
- [x] Define buzz keywords and weights
- [x] Score by keyword matches
- [x] Add category bonuses and numeric patterns
- [x] Extract suggested hashtags
- [x] Export analyzeBuzzPotential
*/

export function analyzeBuzzPotential(article) {
  const { title = '', contentSnippet = '', category } = article;

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
      if (title.includes(keyword) || contentSnippet.includes(keyword)) {
        buzzScore += type === 'shock' ? 3 : type === 'ai' ? 2 : 1;
        matchedKeywords.push(keyword);
      }
    }
  }

  if (category === 'ai') buzzScore += 2;
  if (category === 'business') buzzScore += 1;

  if (/\d+([億兆]円|%|倍)/.test(`${title}${contentSnippet}`)) {
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
