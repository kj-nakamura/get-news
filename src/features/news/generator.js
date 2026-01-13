import { callGeminiAPI } from "../../shared/lib/gemini.js";
import { truncateAtSentenceEnd } from "../../shared/utils/text-utils.js";

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
・文字数は220〜240文字
・抽象論だけで終わらせない
・数字を1つ以上入れる
・体験、観察、聞いた話ベースで書く
・ハッシュタグ、絵文字は禁止
・「」などのカギカッコの使用は禁止

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

  const MAX_TEXT_LENGTH = 240;
  if (tweetText && tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  return tweetText;
}

export async function generateFromTweet(article) {
  const { title, contentSnippet = "", matchedKeywords = [], category } = article;

  const prompt = `
あなたは技術ニュースに対して鋭い視点で感想や意見を述べる専門家です。以下のニュース記事を読んで、あなた自身の感想・意見・印象を述べるツイートを作成してください。

【ニュース記事】
カテゴリ: ${String(category || "").toUpperCase()}
タイトル: ${title}
内容: ${contentSnippet}
キーワード: ${matchedKeywords.join(", ")}

【ツイート作成指示】
・記事の要点（出来事や変化の本質）を噛み砕いて述べ、それに対する自分の意見や感情を率直に書く
・リンクがなくても読者が記事内容を想像できるよう、数字や事実は一般化して簡潔に触れる
・記事タイトルや媒体名など出典が特定される固有名詞は避ける
・第三者視点や曖昧な推測は避け、自分の視点で明確な立場を示す
・過激すぎず、冷静だが芯のある主張にする（むやみに「断言する」と書かない）
・ハッシュタグと絵文字は禁止
・「」などのカギカッコの使用は禁止
・日本語全角で240文字以内

文体イメージ：
○○社が□□を公開したが、現場の課題を無視したこの速度感ではユーザー信頼を削るだけだ。技術の進歩は歓迎すべきだが、それによって失われる人間性や倫理性についても、私たちはもっと深く議論すべき時期に来ているのではないだろうか。
`;

  const aiText = await callGeminiAPI(prompt);
  console.log(`Gemini API response: "${aiText}"`);
  let tweetText = aiText || generateFallbackTweet(article);

  const MAX_TEXT_LENGTH = 240;
  if (tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  return tweetText;
}

function generateFallbackTweet({ title = "", contentSnippet = "" }) {
  const MAX_LENGTH = 240;
  const content = contentSnippet || title;
  return truncateAtSentenceEnd(content, MAX_LENGTH);
}
