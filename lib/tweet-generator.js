/*
TODOs (tweet-generator.js)
- [x] Build prompt tailored for virality
- [x] Call Gemini API with safety handling
- [x] Ensure hashtags included
- [x] Enforce 140-char constraint
- [x] Provide fallback tweet templates
- [x] Updated to use @google/generative-ai SDK with gemini-2.5-flash
*/

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateTweet(article) {
  const { title, contentSnippet = "", matchedKeywords = [], category, source, link } = article;

  const prompt = `
あなたは技術ニュースに対して鋭い視点で感想や意見を述べる専門家です。以下のニュース記事を読んで、あなた自身の感想・意見・印象を述べるツイートを作成してください。

【ニュース記事】
カテゴリ: ${String(category || "").toUpperCase()}
タイトル: ${title}
内容: ${contentSnippet}
出典: ${source}
キーワード: ${matchedKeywords.join(", ")}

【ツイート作成指示】
✅ 記事の内容に対する率直な感想や意見を述べる
✅ 「これは興味深い」「驚いた」「心配だ」「期待できる」などの感情表現を使う
✅ あなた個人の視点から見た印象や考えを書く
✅ 記事を読んで感じたことを自然な口調で表現
✅ 具体的な数字や事実に対する感想も含める
✅ ハッシュタグは使わない
✅ 絵文字を効果的に使用（2-3個）
✅ 日本語全角文字を考慮して本文は120文字以内に収める

【例】
❌ 悪い例: 「○○が新機能をリリースしました」（客観的すぎる）
⭐ 良い例: 「これはすごい！AIがついにここまで来たのか 😲 正直、こんなに早く実現するとは思ってなかった」（120文字以内の感想）

【出力】
感想・意見ツイートのみを出力してください。
`;

  const aiText = await callGeminiAPI(prompt);
  console.log(`Gemini API response: "${aiText}"`);
  let tweetText = aiText || generateFallbackTweet(article);

  if (!aiText) {
    console.log("⚠️ Using fallback tweet (Gemini API returned null/empty)");
  } else {
    console.log("✓ Using Gemini-generated opinion tweet");
  }

  // 日本語全角文字を考慮して、本文の上限は120文字
  const MAX_TEXT_LENGTH = 120;
  const urlToAdd = link || "";

  // 文字数制限を超える場合、文章の途中で切れないよう調整
  if (tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  // 生成された感想ツイートが120文字以内であることを確認・ログ出力
  console.log(`Generated opinion tweet length: ${tweetText.length} characters (max: ${MAX_TEXT_LENGTH})`);
  if (tweetText.length <= MAX_TEXT_LENGTH) {
    console.log("✓ Opinion tweet is within character limit");
  } else {
    console.log("⚠️ Opinion tweet exceeded limit and was truncated");
  }

  // URLを追加
  const finalTweet = urlToAdd ? `${tweetText} ${urlToAdd}`.trim() : tweetText;

  return finalTweet;
}

async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set. Using fallback.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
        thinkingConfig: {
          thinkingBudget: 0, // 思考機能を無効化
        },
      },
    });

    const response = await result.response;
    const text = response.text();
    return text?.trim() || null;
  } catch (error) {
    console.error("💥 Gemini API Error:", error.message || error);
    if (error.response) {
      console.error("📋 Error response:", error.response);
    }
    return null;
  }
}

// 文章の途中で切れないよう、適切な位置で切り詰める（句点は最大2つまで）
function truncateAtSentenceEnd(text, maxLength) {
  // まず句点数を2つ以下に制限
  const limitedText = limitSentenceCount(text, 2);
  
  if (limitedText.length <= maxLength) return limitedText;

  // 文の区切り文字で分割を試みる
  const sentenceEnders = ["。", "！", "？", ".", "!", "?"];

  // まず文の終わりで切れるかチェック
  for (let i = maxLength - 1; i >= maxLength - 20 && i > 0; i--) {
    if (sentenceEnders.includes(limitedText[i])) {
      return limitedText.substring(0, i + 1);
    }
  }

  // スペースで切れるかチェック
  for (let i = maxLength - 1; i >= maxLength - 10 && i > 0; i--) {
    if (limitedText[i] === " ") {
      return limitedText.substring(0, i);
    }
  }

  // 最後の手段として「...」を付けて切り詰め
  return limitedText.substring(0, maxLength - 3) + "...";
}

// 句点数を指定した数以下に制限する
function limitSentenceCount(text, maxSentences) {
  if (!text) return text;
  
  let sentenceCount = 0;
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += char;
    
    if (char === '。') {
      sentenceCount++;
      if (sentenceCount >= maxSentences) {
        break;
      }
    }
  }
  
  return result;
}

function generateFallbackTweet({ title = "", contentSnippet = "", category = "news" }) {
  const MAX_LENGTH = 120; // URL分は別途追加されるため、本文のみで120文字まで

  // 感想・意見が生成できない場合は記事内容をそのまま使用
  const content = contentSnippet || title;

  // 120文字以内に収まるよう調整
  return truncateAtSentenceEnd(content, MAX_LENGTH);
}

export default generateTweet;
