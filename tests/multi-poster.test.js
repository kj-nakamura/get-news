import assert from "node:assert/strict";
import test from "node:test";

import MultiPoster from "../lib/multi-poster.js";

test("MultiPosterはプラットフォームごとの検証結果をまとめる", () => {
  const poster = new MultiPoster({
    platforms: ["x", "threads"],
    dryRun: true,
  });

  const longText = "あ".repeat(300);
  const validation = poster.validatePost(longText);

  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some((error) => error.startsWith("X:")));
  assert.ok(validation.errors.every((error) => error.includes("max: 280")));
});

test("MultiPosterはドライランで両方の投稿を成功扱いにする", async () => {
  const poster = new MultiPoster({
    platforms: ["x", "threads"],
    dryRun: true,
  });

  const result = await poster.publishPost("テスト投稿");

  assert.equal(result.success, true);
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.failed, 0);
  assert.ok(result.results.x.dryRun);
  assert.ok(result.results.threads.dryRun);
});
