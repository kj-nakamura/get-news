import assert from "node:assert/strict";
import test from "node:test";

import { analyzeBuzzPotential } from "../lib/buzz-analyzer.js";

test("バズ分析でキーワードとハッシュタグを抽出する", () => {
  const article = {
    title: "副業収入が2倍に、円安で家計も揺れる",
    contentSnippet: "ふるさと納税や確定申告の違いを整理する動きが出ている",
    category: "business",
  };

  const result = analyzeBuzzPotential(article);

  assert.equal(result.buzzScore, 14);
  assert.deepEqual(result.trendingTopics, ["#資産形成", "#家計管理", "#キャリア"]);
  assert.ok(result.matchedKeywords.includes("円安"));
  assert.ok(result.matchedKeywords.includes("副業"));
  assert.ok(result.matchedKeywords.includes("ふるさと納税"));
  assert.ok(result.matchedKeywords.includes("確定申告"));
});


test("該当キーワードがない場合はスコア0になる", () => {
  const article = {
    title: "小さな街のイベントレポート",
    contentSnippet: "地元の祭りが開催された",
    category: "news",
  };

  const result = analyzeBuzzPotential(article);

  assert.equal(result.buzzScore, 0);
  assert.deepEqual(result.trendingTopics, []);
  assert.deepEqual(result.matchedKeywords, []);
});
