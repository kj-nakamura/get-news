import assert from "node:assert/strict";
import test from "node:test";

import { getGeminiModelName, truncateAtSentenceEnd } from "../lib/tweet-generator.js";

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

test("getGeminiModelNameは環境変数とNODE_ENVを優先する", () => {
  const originalGeminiModel = process.env.GEMINI_MODEL;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.GEMINI_MODEL;
    process.env.NODE_ENV = "production";
    assert.equal(getGeminiModelName(), "gemini-2.5-flash");

    process.env.NODE_ENV = "development";
    assert.equal(getGeminiModelName(), "gemini-2.5-flash-lite");

    process.env.GEMINI_MODEL = "custom-model";
    assert.equal(getGeminiModelName(), "custom-model");
  } finally {
    if (originalGeminiModel === undefined) {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = originalGeminiModel;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  }
});
