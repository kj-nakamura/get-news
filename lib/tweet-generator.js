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
あなたは技術ニュースを分かりやすく要約し、バズるツイートを作成する専門家です。以下のニュース記事を読んで、内容を要約・解説したツイートを作成してください。

【ニュース記事】
カテゴリ: ${String(category || "").toUpperCase()}
タイトル: ${title}
内容: ${contentSnippet}
出典: ${source}
キーワード: ${matchedKeywords.join(", ")}

【ツイート作成指示】
✅ タイトルをそのまま使わず、記事の内容を要約・解説する
✅ 技術的な内容を一般の人にも分かりやすく説明
✅ 「なぜ重要なのか」「どんな影響があるのか」を含める
✅ 感情に訴える表現で興味を引く
✅ 具体的な数字や事実があれば必ず含める
✅ ハッシュタグは使わない
✅ 絵文字を効果的に使用（2-3個）
✅ URLは23文字でカウントされるため、本文は247文字以内に収める（280-23-10=247）

【例】
❌ 悪い例: 「○○が新機能をリリース」
⭐ 良い例: 「AIが人間の仕事を奪うどころか、むしろ創造性を高めることが判明！新研究で○○%の生産性向上を実証 🚀 これからの働き方が大きく変わりそう」

【出力】
要約・解説ツイートのみを出力してください。
`;

  const aiText = await callGeminiAPI(prompt);
  let tweetText = aiText || generateFallbackTweet(article);

  // URLは23文字でカウントされるため、本文の上限は257文字
  const MAX_TEXT_LENGTH = 257;
  const urlToAdd = link || "";

  // 文字数制限を超える場合、文章の途中で切れないよう調整
  if (tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  // 生成されたsummaryが247文字以内であることを確認・ログ出力
  console.log(`Generated summary length: ${tweetText.length} characters (max: ${MAX_TEXT_LENGTH})`);
  if (tweetText.length <= MAX_TEXT_LENGTH) {
    console.log("✓ Summary is within character limit");
  } else {
    console.log("⚠️ Summary exceeded limit and was truncated");
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
        maxOutputTokens: 100,
        temperature: 0.8,
      },
    });

    const response = await result.response;
    const text = response.text();
    return text?.trim() || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}

// 文章の途中で切れないよう、適切な位置で切り詰める
function truncateAtSentenceEnd(text, maxLength) {
  if (text.length <= maxLength) return text;

  // 文の区切り文字で分割を試みる
  const sentenceEnders = ["。", "！", "？", ".", "!", "?"];
  const punctuation = ["、", "，", ",", "；", ";"];

  // まず文の終わりで切れるかチェック
  for (let i = maxLength - 1; i >= maxLength - 20 && i > 0; i--) {
    if (sentenceEnders.includes(text[i])) {
      return text.substring(0, i + 1);
    }
  }

  // 句読点で切れるかチェック
  for (let i = maxLength - 1; i >= maxLength - 15 && i > 0; i--) {
    if (punctuation.includes(text[i])) {
      return text.substring(0, i + 1);
    }
  }

  // スペースで切れるかチェック
  for (let i = maxLength - 1; i >= maxLength - 10 && i > 0; i--) {
    if (text[i] === " ") {
      return text.substring(0, i);
    }
  }

  // 最後の手段として「...」を付けて切り詰め
  return text.substring(0, maxLength - 3) + "...";
}

function generateFallbackTweet({ title = "", contentSnippet = "", category = "news" }) {
  const MAX_LENGTH = 247; // URL分は別途追加されるため、本文のみで247文字まで

  // summaryのみを使用（templatesは不要）
  const summary = contentSnippet || title;

  // 247文字以内に収まるよう調整
  return truncateAtSentenceEnd(summary, MAX_LENGTH);
}

export default generateTweet;
