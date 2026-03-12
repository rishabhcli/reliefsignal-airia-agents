import { createWorkspace } from "./state.js";

export const DEMO_INPUT = `Goal: Coordinate the first 72 hours of flood response across Riverbend district.
- Incoming field update: 42 families at East Bank School need dry shelter before sunset.
- Volunteer note: two boat crews can deploy at 14:00 if fuel is confirmed.
- Clinic report: insulin, wound-care kits, and oral rehydration salts are down to a one-day buffer.
- Needs assessment: a landslide blocked the north access road and delayed food deliveries to three villages.
- Community lead requests multilingual SMS guidance for safe water pickup points and shelter check-in times.
- Need to verify which villages still lack power and mobile coverage before the evening coordination call.
- Prepare partner outreach for school shelters, transport unions, and local radio operators.
- Build a volunteer shift checklist that covers registration, safety, child-protection protocol, and night operations.
- Deadline: lock the first response brief before the 18:00 district coordination meeting.`;

export function createDemoWorkspace(baseDate = new Date()) {
  return createWorkspace({
    workspaceName: "ReliefSignal | Riverbend Flood Desk",
    objective: "Protect displaced households, restore safe access, and stabilize the first 72 hours of relief in Riverbend district",
    sourceInput: DEMO_INPUT,
    baseDate,
    mutateTasks(tasks) {
      return tasks.map((task, index) => {
        if (index === 0) {
          return { ...task, stage: "Mobilizing" };
        }

        if (index === 1 || index === 2) {
          return { ...task, stage: "Verified" };
        }

        if (index === 4) {
          return { ...task, stage: "Resolved" };
        }

        return task;
      });
    }
  });
}
