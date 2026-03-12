import test from "node:test";
import assert from "node:assert/strict";

import {
  extractSignals,
  generateResponsePlan,
  groupTasksByStage,
  groupTasksByWindow
} from "../app/src/planner.js";

test("extractSignals keeps meaningful field updates", () => {
  const segments = extractSignals(`
    - Need dry shelter for 20 families before sunset
    - Verify the road blockage near the river bridge.
    - Verify the road blockage near the river bridge.
  `);

  assert.deepEqual(segments, [
    "Need dry shelter for 20 families before sunset",
    "Verify the road blockage near the river bridge"
  ]);
});

test("generateResponsePlan creates prioritized signals and an operational window", () => {
  const plan = generateResponsePlan(
    `
      Medical team reports insulin shortage at the district clinic.
      Verify how many families still need shelter tonight.
      Prepare radio outreach for clean water pickup points.
      Confirm fuel for boat crews and delivery trucks.
    `,
    {
      objective: "Stabilize Riverbend flood response",
      baseDate: new Date("2026-03-11T10:00:00-08:00")
    }
  );

  assert.equal(plan.windows.length, 4);
  assert.ok(plan.tasks.length >= 4);
  assert.ok(plan.tasks[0].priority >= plan.tasks[plan.tasks.length - 1].priority);
  assert.ok(plan.tasks.every((task) => task.dueWindow));
  assert.match(plan.summary.headline, /Stabilize Riverbend flood response/);
});

test("grouping helpers preserve every signal once", () => {
  const plan = generateResponsePlan(
    `
      Run a needs assessment at the school shelter.
      Confirm the volunteer safety briefing roster.
      Message local radio with verified flood guidance.
    `,
    {
      objective: "Keep the first response cycle coordinated",
      baseDate: new Date("2026-03-11T10:00:00-08:00")
    }
  );

  const stageTotal = groupTasksByStage(plan.tasks).reduce((total, group) => total + group.tasks.length, 0);
  const windowTotal = groupTasksByWindow(plan.tasks, plan.windows).reduce(
    (total, group) => total + group.tasks.length,
    0
  );

  assert.equal(stageTotal, plan.tasks.length);
  assert.equal(windowTotal, plan.tasks.length);
});
