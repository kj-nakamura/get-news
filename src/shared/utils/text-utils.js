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
export function limitSentenceCount(text, maxSentences) {
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
