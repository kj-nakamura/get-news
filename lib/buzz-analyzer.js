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

  const themeKeywords = {
    investment: [
      '新NISA',
      'つみたてNISA',
      '成長投資枠',
      'iDeCo',
      'オルカン',
      'S&P500',
      'インデックス',
      'ETF',
      '高配当',
      '配当',
      '利回り',
      'リバランス',
      '暴落',
      '円安',
      '金利',
      'インフレ'
    ],
    household: [
      '税金',
      '住民税',
      '社会保険',
      '手取り',
      '控除',
      'ふるさと納税',
      '確定申告',
      '経費',
      '副業バレ',
      '住宅ローン',
      '変動金利',
      '固定金利',
      '教育費',
      '生活防衛資金'
    ],
    work: [
      '転職',
      '退職',
      '退職代行',
      '面接',
      '職務経歴書',
      '年収',
      '年収交渉',
      '評価',
      '昇給',
      'リストラ',
      '副業',
      'フリーランス',
      '案件',
      '単価',
      '稼働',
      'SES',
      'リモート',
      '生成AI活用'
    ]
  };

  const intentKeywords = {
    riskAvoidance: ['危険', '失敗', '後悔', '詐欺', 'やめとけ', '改悪', '損', '罠'],
    comparison: ['おすすめ', '比較', 'どっち', '違い', 'メリット', 'デメリット', 'ランキング'],
    howTo: ['やり方', '手順', '始め方', 'いつ', 'いくら', '必要書類', 'テンプレ']
  };

  let buzzScore = 0;
  const matchedKeywords = [];
  const matchedThemes = new Set();
  const matchedIntents = new Set();

  const text = `${title}${contentSnippet}`;

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        buzzScore += 2;
        matchedKeywords.push(keyword);
        matchedThemes.add(theme);
      }
    }
  }

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        buzzScore += 1;
        matchedKeywords.push(keyword);
        matchedIntents.add(intent);
      }
    }
  }

  if (matchedThemes.size > 0 && matchedIntents.size > 0) {
    buzzScore += 2;
  }

  if (category === 'ai') buzzScore += 2;
  if (category === 'business') buzzScore += 1;

  if (/\d+([億兆]円|%|倍)/.test(`${title}${contentSnippet}`)) {
    buzzScore += 2;
  }

  const trendingTopics = extractHashtags(title, matchedKeywords, matchedThemes);

  return {
    ...article,
    buzzScore,
    matchedKeywords,
    trendingTopics
  };
}

function extractHashtags(title, keywords, matchedThemes) {
  const hashtags = [];

  if (matchedThemes.has('investment')) hashtags.push('#資産形成');
  if (matchedThemes.has('household')) hashtags.push('#家計管理');
  if (matchedThemes.has('work')) hashtags.push('#キャリア');

  if (keywords.some((keyword) => ['新NISA', 'つみたてNISA', '成長投資枠'].includes(keyword))) {
    hashtags.push('#NISA');
  }

  if (keywords.some((keyword) => ['iDeCo', 'オルカン', 'S&P500', 'ETF'].includes(keyword))) {
    hashtags.push('#投資初心者');
  }

  if (keywords.includes('ふるさと納税') || keywords.includes('確定申告')) hashtags.push('#節税');
  if (keywords.includes('副業')) hashtags.push('#副業');
  if (title.includes('AI') || keywords.includes('生成AI活用')) hashtags.push('#AI活用');

  return Array.from(new Set(hashtags)).slice(0, 3);
}

export default analyzeBuzzPotential;
