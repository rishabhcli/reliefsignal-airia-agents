import test from "node:test";
import assert from "node:assert/strict";

import { buildResponseBrief } from "../app/src/exporter.js";
import { createDemoWorkspace } from "../app/src/demo.js";

test("buildResponseBrief includes objective, checklist, outreach, and board status", () => {
  const workspace = createDemoWorkspace(new Date("2026-03-11T10:00:00-08:00"));
  const brief = buildResponseBrief(workspace);

  assert.match(brief, /ReliefSignal Response Brief: ReliefSignal \| Riverbend Flood Desk/);
  assert.match(brief, /Objective: Protect displaced households/);
  assert.match(brief, /## Coordination Checklist/);
  assert.match(brief, /## Outreach Plan/);
  assert.match(brief, /## Board Status/);
  assert.match(brief, /Mobilizing:/);
});
