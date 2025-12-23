import assert from "node:assert/strict";
import test from "node:test";

import { truncateAtSentenceEnd } from "../lib/tweet-generator.js";

test("上限超過時は直前の句点で切り詰める", () => {
  const text = "短い文。これは長い文で続くので途中で切りたい。さらに続く。";
  const result = truncateAtSentenceEnd(text, 18);

  assert.equal(result, "短い文。");
});

test("上限内に句点があればその位置で切る", () => {
  const text = "最初の文。次の文。";
  const result = truncateAtSentenceEnd(text, 6);

  assert.equal(result, "最初の文。");
});

test("句点がなければ上限で切り詰める", () => {
  const text = "句点がない文章なので上限で切る";
  const result = truncateAtSentenceEnd(text, 5);

  assert.equal(result, "句点がない");
});
