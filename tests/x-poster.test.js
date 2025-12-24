import assert from "node:assert/strict";
import test from "node:test";

import XPoster from "../lib/x-poster.js";

test("XPosterはドライランで投稿をシミュレーションする", async () => {
  const poster = new XPoster({ dryRun: true });

  const result = await poster.publishPost("テスト投稿");

  assert.equal(result.success, true);
  assert.equal(result.dryRun, true);
  assert.match(result.id, /^dry-run-/);
});

test("XPosterは280文字を超える投稿を拒否する", () => {
  const poster = new XPoster({ dryRun: true });
  const longText = "あ".repeat(281);

  const validation = poster.validatePost(longText);

  assert.equal(validation.isValid, false);
  assert.ok(validation.errors[0].includes("max: 280"));
});
