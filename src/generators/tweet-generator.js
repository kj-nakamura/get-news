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

export function getGeminiModelName() {
  const isProduction = process.env.NODE_ENV === "production";
  return process.env.GEMINI_MODEL || (isProduction ? "gemini-2.5-flash" : "gemini-2.5-flash-lite");
}

export async function generateTweet() {
  const prompt = `
役割:
・あなたは、日本で資産1000万円に到達するまでの過程を、成功論として断定せず、観察や実感ベースで語る発信者。

目的:
・資産1000万円に到達する方法を、あらゆる視点から「気づき」としてX向けに1ツイートで発信する。

テーマ:
・資産1000万円に到達するための考え方・行動・選択。
・ただし成功法則として言い切らず、実際に見聞きした例や体感をもとに語ること。

論点（毎回ランダムで1つ選ぶ）:
・収入を増やす視点
・支出を減らす視点
・投資で増やす視点
・時間を味方につける視点
・リスク管理の視点
・心理・メンタルの視点
・習慣・行動設計の視点
・日本の制度・税制の視点
・会社員としての戦略
・フリーランスとしての戦略
・経営者としての戦略
・20代の戦略
・30代の戦略
・40代の戦略
・失敗例・遠回りの話
・凡人でも再現できそうな話

トーン:
・一人称の独白
・デスマス調は禁止
・断定しすぎない
・煽り、説教、命令は禁止
・感情は控えめで穏やか
・少し距離を取った冷静な視点
・「気づいたらそうなっていた」くらいの温度感

言葉遣い:
・「〜な気がする」「〜だったりする」「〜かもしれない」は使用可
・「すべき」「必ず」「絶対」「成功法則」は使用禁止
・他人を評価・断罪しない
・マウントに見える表現は禁止

作成指示:
・文字数は120〜150文字
・抽象論だけで終わらせない
・数字を1つ以上入れる
・体験、観察、聞いた話ベースで書く
・ハッシュタグ、絵文字は禁止

構成:
1. ふとした気づき・違和感から入る
2. なぜそう感じたかを軽く添える
3. 行動や選択の示唆を押し付けずに置く

出力:
・ツイート本文のみを出力
・前置き、解説、見出しは不要
`;

  const aiText = await callGeminiAPI(prompt);
  console.log(`Gemini API response: "${aiText}"`);
  let tweetText = aiText;

  if (!aiText) {
    console.log("⚠️ Using fallback tweet (Gemini API returned null/empty)");
  } else {
    console.log("✓ Using Gemini-generated opinion tweet");
  }

  // 日本語全角文字を考慮して、本文の上限は120文字
  const MAX_TEXT_LENGTH = 120;

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

  return tweetText;
}

export async function generateFromTweet(article) {
  const { title, contentSnippet = "", matchedKeywords = [], category, source, link } = article;

  const prompt = `
あなたは技術ニュースに対して鋭い視点で感想や意見を述べる専門家です。以下のニュース記事を読んで、あなた自身の感想・意見・印象を述べるツイートを作成してください。

【ニュース記事】
カテゴリ: ${String(category || "").toUpperCase()}
タイトル: ${title}
内容: ${contentSnippet}
キーワード: ${matchedKeywords.join(", ")}

【ツイート作成指示】
・1文構成で、文頭に記事の要点（出来事や変化の本質）を噛み砕いて述べる
・同じ文の後半で、その要点に対する自分の意見や感情を率直に書き、要点と意見を密接に結び付ける
・リンクがなくても読者が記事内容を想像できるよう、数字や事実は一般化して簡潔に触れる
・記事タイトルや媒体名など出典が特定される固有名詞は避ける
・第三者視点や曖昧な推測は避け、自分の視点で明確な立場を示す
・過激すぎず、冷静だが芯のある主張にする（むやみに「断言する」と書かない）
・ハッシュタグと絵文字は禁止
・日本語全角で120文字以内

文体イメージ：
「○○社が□□を公開したが、現場の課題を無視したこの速度感ではユーザー信頼を削るだけだ。」
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

  return tweetText;
}

async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set. Using fallback.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = getGeminiModelName();
    console.log(`Using Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

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
export function truncateAtSentenceEnd(text, maxLength) {
  // まず句点数を2つ以下に制限
  const limitedText = limitSentenceCount(text, 2);

  if (limitedText.length <= maxLength) return limitedText;

  const sentenceEnders = ["。", "！", "？", ".", "!", "?"];

  const sentenceIndex = findLastIndexWithin(limitedText, sentenceEnders, maxLength - 1);
  if (sentenceIndex !== -1) {
    return limitedText.substring(0, sentenceIndex + 1);
  }

  const lastSentenceIndex = findLastIndexWithin(limitedText, sentenceEnders, limitedText.length - 1);
  if (lastSentenceIndex !== -1) {
    return limitedText.substring(0, lastSentenceIndex + 1);
  }

  return limitedText.substring(0, maxLength).trimEnd();
}

function findLastIndexWithin(text, targets, maxIndex) {
  const end = Math.min(maxIndex, text.length - 1);
  for (let i = end; i >= 0; i--) {
    if (targets.includes(text[i])) {
      return i;
    }
  }
  return -1;
}

// 句点数を指定した数以下に制限する
function limitSentenceCount(text, maxSentences) {
  if (!text) return text;

  let sentenceCount = 0;
  let result = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += char;

    if (char === "。") {
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

export async function generateNoteTweet(title) {
  const prompt = `
役割:
・あなたは洞察力のあるSNS発信者です。noteの記事タイトルを見て、そのテーマに関する深い気づきや独自の視点をツイートします。

対象記事タイトル:
${title}

作成指示:
・このタイトルから記事の内容やテーマを推測し、それに対するあなたの意見、感想、または読者への問いかけを作成してください。
・単なる記事紹介ではなく、あなたの思考として発信してください。
・「〜という記事を読みました」という前置きは不要です。いきなり本題に入ってください。
・断定的な口調（〜だ、〜である）または独白調で。
・日本語全角120文字以内。
・ハッシュタグ、絵文字は禁止。

文体イメージ:
「タイトルにある〇〇という視点は盲点だった。確かに、〜という状況では逆に〜なのかもしれない。」
`;

  const aiText = await callGeminiAPI(prompt);
  console.log(`Gemini API response for Note: "${aiText}"`);
  
  let tweetText = aiText || title; // Fallback to title if generation fails

  const MAX_TEXT_LENGTH = 120;
  if (tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  return tweetText;
}

export default generateTweet;
