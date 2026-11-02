import { test } from "node:test";
import assert from "node:assert/strict";
import {
  excerptText,
  sectionDate,
  isWithinTopic,
  runningMetrics,
} from "../src/lib/section-presentation.mjs";

test("topic descendants match on path boundaries without duplicated ancestor assignments", () => {
  assert.equal(isWithinTopic(["kafka/consumer/rebalancing"], "kafka"), true);
  assert.equal(isWithinTopic(["kafka-other"], "kafka"), false);
  assert.equal(isWithinTopic(["ai/agents", "java"], "java"), true);
});
test("exercise uses the explicit activity date without changing publication dates elsewhere", () => {
  const post = { date: "2026-09-30", activityDate: "2026-09-29" };
  assert.equal(sectionDate(post, "exercise"), "2026-09-29");
  assert.equal(sectionDate(post, "journal"), "2026-09-30");
  assert.equal(
    sectionDate({ ...post, activityDate: "invalid" }, "exercise"),
    post.date,
  );
});
test("running metrics support table and list summaries and do not guess from unrelated numbers", () => {
  assert.deepEqual(
    runningMetrics("- 거리: **6.42 km**\n- 평균 페이스: **7'27\"/km**"),
    { distance: "6.42", pace: "7'27\"" },
  );
  assert.deepEqual(
    runningMetrics("| 거리 | 10.03 km |\n| 평균 페이스 | 7'41\"/km |"),
    { distance: "10.03", pace: "7'41\"" },
  );
  assert.deepEqual(runningMetrics("목표는 10km. 예전 7분 페이스를 생각했다."), {
    distance: undefined,
    pace: undefined,
  });
});
test("excerpts omit markup, images and code blocks while retaining Korean graphemes", () => {
  assert.equal(
    excerptText(
      "# 제목\n\n실제 **본문** [참조](https://example.com)\n```js\nprivateCode()\n```\n![사진](image.png)",
    ),
    "실제 본문 참조",
  );
  assert.equal(excerptText("가나다라마", 3), "가나다…");
});
