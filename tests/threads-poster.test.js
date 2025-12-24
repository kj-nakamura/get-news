import assert from "node:assert/strict";
import test from "node:test";

import ThreadsPoster from "../lib/threads-poster.js";

test("ThreadsPosterはドライランで投稿をシミュレーションする", async () => {
  const poster = new ThreadsPoster({ dryRun: true });

  const result = await poster.publishPost("テスト投稿");

  assert.equal(result.success, true);
  assert.equal(result.dryRun, true);
  assert.match(result.id, /^dry-run-threads-/);
});

test("ThreadsPosterは500文字を超える投稿を拒否する", () => {
  const poster = new ThreadsPoster({ dryRun: true });
  const longText = "あ".repeat(501);

  const validation = poster.validatePost(longText);

  assert.equal(validation.isValid, false);
  assert.ok(validation.errors[0].includes("max: 500"));
});
