import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduledTheme, nextThemeBoundary } from "../src/lib/theme.mjs";

test("themes switch at 06:00 and 18:00 Korea time", () => {
  for (const [time, expected] of [["05:59:59", "dark"], ["06:00:00", "light"],
    ["17:59:59", "light"], ["18:00:00", "dark"], ["23:59:59", "dark"]]) {
    assert.equal(scheduledTheme(Date.parse(`2026-10-28T${time}+09:00`)), expected);
  }
});

test("the next boundary handles midnight, month and year rollover", () => {
  for (const [now, next] of [
    ["2026-10-28T05:59:59+09:00", "2026-10-28T06:00:00+09:00"],
    ["2026-10-28T06:00:00+09:00", "2026-10-28T18:00:00+09:00"],
    ["2026-10-31T18:00:00+09:00", "2026-11-01T06:00:00+09:00"],
    ["2026-12-31T23:59:59+09:00", "2027-01-01T06:00:00+09:00"],
  ]) assert.equal(nextThemeBoundary(Date.parse(now)), Date.parse(next));
});
