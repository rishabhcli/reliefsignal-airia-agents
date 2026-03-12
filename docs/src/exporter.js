import { groupTasksByWindow, sortSignalsForDisplay } from "./planner.js";

const OUTREACH_RECIPIENTS = {
  "Search & Rescue": "Municipal rescue teams, boat operators, and route coordinators",
  Medical: "Clinics, ambulance dispatchers, and medicine suppliers",
  Shelter: "School shelters, community centers, and protection volunteers",
  Logistics: "Transport unions, warehouse leads, and fuel suppliers",
  Assessment: "Field assessment leads, mapping volunteers, and local officials",
  "Volunteer Ops": "Volunteer captains, safety leads, and registration desks",
  "Community Comms": "Radio stations, WhatsApp admins, translators, and hotline staff",
  Coordination: "The next available local coordination partner"
};

function boardSnapshot(tasks) {
  return tasks.reduce((counts, task) => {
    counts[task.stage] = (counts[task.stage] ?? 0) + 1;
    return counts;
  }, {});
}

function buildChecklist(sortedTasks) {
  return sortedTasks.slice(0, 5).map((task) => `- [ ] ${task.title} (${task.stage}, ${task.timebox}, ${task.dueLabel})`);
}

function buildOutreachPlan(sortedTasks) {
  const categories = [...new Set(sortedTasks.slice(0, 4).map((task) => task.category))];

  return categories.map((category) => {
    const leadTask = sortedTasks.find((task) => task.category === category);
    const recipient = OUTREACH_RECIPIENTS[category] ?? OUTREACH_RECIPIENTS.Coordination;
    return `- ${recipient}: align on "${leadTask?.title ?? "the top open signal"}" and confirm who owns the next update.`;
  });
}

export function buildResponseBrief(state) {
  const sortedTasks = sortSignalsForDisplay(state.tasks);
  const groupedWindows = groupTasksByWindow(state.tasks, state.windows);
  const counts = boardSnapshot(state.tasks);

  const lines = [
    `# ReliefSignal Response Brief: ${state.workspaceName}`,
    "",
    `Objective: ${state.objective}`,
    `Operational window: ${state.windowLabel}`,
    `Generated: ${new Date(state.generatedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    })}`,
    "",
    "## Situation Summary",
    `- ${state.summary.focus}`,
    `- Briefing lead: ${state.summary.briefing}`,
    `- Coordination rhythm: ${state.summary.cadence}`,
    `- Risk watch: ${state.summary.risk}`,
    "",
    "## Priority Queue",
    ...sortedTasks.map(
      (task, index) =>
        `${index + 1}. ${task.title} [Priority ${task.priority} | ${task.category} | ${task.priorityBand} | ${task.timebox}]`
    ),
    "",
    "## Coordination Checklist",
    ...buildChecklist(sortedTasks),
    "",
    "## Outreach Plan",
    ...buildOutreachPlan(sortedTasks),
    "",
    "## 72-Hour Response Window",
    ...groupedWindows.flatMap((window) => {
      const taskLines =
        window.tasks.length > 0
          ? window.tasks.map((task) => `  - ${task.title} (${task.stage}, ${task.timebox})`)
          : ["  - Hold this window for reassessment, public updates, and recovery handoff."];

      return [`- ${window.label} | ${window.dateLabel} | ${window.emphasis}`, ...taskLines];
    }),
    "",
    "## Board Status",
    `- Incoming: ${counts.Incoming ?? 0}`,
    `- Verified: ${counts.Verified ?? 0}`,
    `- Mobilizing: ${counts.Mobilizing ?? 0}`,
    `- Resolved: ${counts.Resolved ?? 0}`
  ];

  return lines.join("\n");
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
  return true;
}

export function downloadBrief(workspaceName, briefText) {
  const slug = workspaceName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const blob = new Blob([briefText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "reliefsignal"}-response-brief.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
