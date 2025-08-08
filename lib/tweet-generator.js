/*
TODOs (tweet-generator.js)
- [x] Build prompt tailored for virality
- [x] Call Gemini API with safety handling
- [x] Ensure hashtags included
- [x] Enforce 140-char constraint
- [x] Provide fallback tweet templates
*/

const MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function generateTweet(article) {
  const { title, contentSnippet = '', matchedKeywords = [], trendingTopics = [], category, source } = article;

  const prompt = `
あなたはバズるツイートを生成する専門家です。以下のニュースから、リツイート・いいねが集まりそうなツイートを作成してください。

【ニュース情報】
カテゴリ: ${String(category || '').toUpperCase()}
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

【出力形式】
ツイート本文のみを出力してください。説明文は不要です。
`;

  const aiText = await callGeminiAPI(prompt);

  let finalTweet = aiText || generateFallbackTweet(article);

  if (!finalTweet.includes('#')) {
    const suggestedTags = trendingTopics.slice(0, 2).join(' ');
    finalTweet = `${finalTweet} ${suggestedTags}`.trim();
  }

  if (finalTweet.length > 140) {
    finalTweet = `${finalTweet.substring(0, 137)}...`;
  }

  return finalTweet;
}

async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set. Using fallback.');
    return null;
  }
  try {
    const response = await fetch(`${MODEL_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.8 }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Gemini API HTTP error:', response.status, text);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return null;
  }
}

function generateFallbackTweet({ title = '', category = 'news' }) {
  const templates = [
    `🚨注目🚨 ${title.substring(0, 80)}... これは見逃せない！ #${category} #話題`,
    `💡新発見💡 ${title.substring(0, 70)}... 皆はどう思う？🤔 #${category} #トレンド`,
    `📈速報📈 ${title.substring(0, 75)}... 要チェック！ #${category} #ニュース`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

export default generateTweet;
