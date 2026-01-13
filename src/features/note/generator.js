import { callGeminiAPI } from "../../shared/lib/gemini.js";
import { truncateAtSentenceEnd } from "../../shared/utils/text-utils.js";

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
・日本語全角220〜240文字以内。
・ハッシュタグ、絵文字は禁止。
・「」などのカギカッコの使用は禁止。

文体イメージ:
タイトルにある〇〇という視点は盲点だった。確かに、〜という状況では逆に〜なのかもしれない。これまでは〜と考えていたが、実は〜という可能性もあるのではないか。そう考えると、私たちの日常における選択肢はもっと多様であるべきだ。
`;

  const aiText = await callGeminiAPI(prompt);
  console.log(`Gemini API response for Note: "${aiText}"`);
  
  let tweetText = aiText || title; // Fallback to title if generation fails

  const MAX_TEXT_LENGTH = 240;
  if (tweetText.length > MAX_TEXT_LENGTH) {
    tweetText = truncateAtSentenceEnd(tweetText, MAX_TEXT_LENGTH);
  }

  return tweetText;
}
